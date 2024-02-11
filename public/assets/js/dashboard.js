document.addEventListener('DOMContentLoaded', function () {

    const token = localStorage.getItem("jwt")

    if (token === null) {
        history.go(-history.length)
        window.location.replace(`${location.origin}/login.html`)
        return
    }

    resetAll()
    resetProductAll()
    const addCreditModalEl = document.getElementById('modal-1')
    const addCreditModal = bootstrap.Modal.getOrCreateInstance(addCreditModalEl)
    const buyProductModalEl = document.getElementById('modal-2')
    const buyProductModal = bootstrap.Modal.getOrCreateInstance(buyProductModalEl)

    const userDataVm = {
        email: ko.observable(""),
        displayName: ko.observable(""),
        createdAt: ko.observable(""),
        userId: -1,
        tarjetas: [],
        productos: ko.observableArray(),
        logout: function (){
            localStorage.removeItem("jwt")
            history.go(-history.length)
            window.location.replace(`${location.origin}/login.html`)
        }
    }
    const userBalanceVM = {
        totalBalance: ko.observable(0),
        income: ko.observable(0),
        bills: ko.observable(0),

        billsWidth: ko.observable("0%")
    }

    function calculateBalance(targets) {
        let totalBalance = 0
        let productsTotal = 0
        for (const targetsKey of targets) {
            totalBalance += targetsKey["cantidad"]
        }
        for (const product of userDataVm.productos()) {
            productsTotal += product.precio
        }
        console.log(totalBalance, productsTotal)
        userBalanceVM.totalBalance(totalBalance - productsTotal)
        userBalanceVM.bills(productsTotal)
        userBalanceVM.income(totalBalance)

        let width = (productsTotal*100)/totalBalance
        userBalanceVM.billsWidth(`${width}%`)
    }
    axios.get(`${apiServer}/users/me?populate=*`, {
        headers: {"Authorization": `Bearer ${token}`}
    }).then(({data}) => {
        const {email, display_name, createdAt, tarjetas, bought_products} = data
        userDataVm.email(email)
        const date = new Date(createdAt)
        userDataVm.createdAt(date.toLocaleDateString("es-MX"))
        userDataVm.displayName(display_name)
        userDataVm.userId = data.id
        userDataVm.tarjetas = tarjetas
        for (const productId of bought_products !== null? bought_products : []) {
            axios.get(`${apiServer}/productos/${productId}`, {headers: {"Authorization": `Bearer ${token}`}})
                .then(({data}) => {
                    const {id, attributes} = data.data;
                    userDataVm.productos.push({...attributes, id})
                    calculateBalance(tarjetas)
                })
        }
        calculateBalance(tarjetas)
    }).catch(e => {
        console.log(e)
    })

    const addCreditVm = {
        isLoadingData: ko.observable(false),
        validCode: ko.observable(false),
        creditQuantity: ko.observable(""),
        codeId: -1,
        errorMsg: ko.observable(""),
        tryToAddCredit: function () {
            this.errorMsg("")
            if (!this.validCode()) {
                this.isLoadingData(true)
                let code = document.querySelector("input[name=otp]").value
                axios.get(`${apiServer}/tarjetas?filters[code][$eq]=${code}`, {
                    headers: {"Authorization": `Bearer ${token}`}
                }).then(({data}) => {
                    this.isLoadingData(false)
                    if (data.data.length === 0) {
                        this.validCode(false)
                        this.errorMsg("Tarjeta no válida o no encontrada")
                    } else {
                        const {id, attributes} = data.data[0]
                        const {cantidad, nombre, code, cobrada} = attributes
                        if (cobrada) {
                            this.errorMsg("Tarjeta ya cobrada")
                            return
                        }
                        for (const tarjeta of userDataVm.tarjetas) {
                            if (tarjeta.id === id) {
                                this.errorMsg("Tarjeta ya ingresada")
                                return
                            }
                        }
                        this.creditQuantity(cantidad)
                        this.codeId = id
                        this.validCode(true)
                    }
                }).catch(e => {
                    this.isLoadingData(false)
                    this.validCode(false)
                    this.errorMsg("Tarjeta no válida o no encontrada")
                })
            } else {
                this.isLoadingData(true)
                axios.put(`${apiServer}/users/${userDataVm.userId}`, {
                    tarjetas: {connect: [this.codeId]}
                }, {
                    headers: {"Authorization": `Bearer ${token}`}
                }).then(data => {
                    axios.put(`${apiServer}/tarjetas/${this.codeId}`, {
                        data: {
                            cobrada: true
                        }
                    }, {
                        headers: {"Authorization": `Bearer ${token}`}
                    }).then(() => {
                        this.isLoadingData(false)
                        this.validCode(false)
                        this.codeId = -1
                        this.creditQuantity = ""
                        addCreditVm.errorMsg("")
                        location.reload()
                    })
                })
            }
        }
    }

    addCreditModalEl.addEventListener('show.bs.modal', evt => {
        resetAll()
    })
    addCreditModalEl.addEventListener('hidden.bs.modal', evt => {
        resetAll()
        addCreditVm.errorMsg("")
    })

    const buyProductVM = {
        isLoadingProductData: ko.observable(false),
        productErrorMsg: ko.observable(""),
        validProductCode: ko.observable(false),

        productName: ko.observable(""),
        productPrice: ko.observable(0),
        productId: -1,
        productCode: ko.observable(""),
        buyProductErrorMsg: ko.observable(""),

        tryToBuyProduct: function () {
            this.isLoadingProductData(true)
            if (this.validProductCode()) {

                if (this.productPrice() > userBalanceVM.totalBalance()) {
                    this.buyProductErrorMsg("No cuentas con saldo suficiente para comprar este producto")
                    return
                }
                let productsIds = userDataVm.productos().map(p => p.id)
                axios.put(`${apiServer}/users/${userDataVm.userId}`, {
                    bought_products: [...productsIds, this.productId]
                }, {
                    headers: {"Authorization": `Bearer ${token}`}
                }).then(res => {
                    this.isLoadingProductData(false)
                    buyProductModal.hide()
                    location.reload()
                })
            } else {
                const productCode = document.querySelector("input[name=product-otp]").value
                axios.get(`${apiServer}/productos?filters[code][$eq]=${productCode}`, {
                    headers: {"Authorization": `Bearer ${token}`}
                }).then(({data}) => {
                    this.isLoadingProductData(false)
                    if (data.data.length === 0) {
                        this.validProductCode(false)
                        this.productErrorMsg("Producto no válido o no encontrado")
                    } else {
                        const {id, attributes} = data.data[0];
                        const {code, nombre, precio, descripcion} = attributes
                        this.validProductCode(true)
                        this.productId = id
                        this.productPrice(precio)
                        this.productName(nombre)
                        this.productCode(productCode)
                    }
                }).catch(e => {
                    this.productErrorMsg("Producto no válido o no encontrado")
                })
            }
        },
        resetProductAll: function () {
            this.productName("")
            this.productPrice(0)
            this.productCode("")
            this.productId = -1
            this.buyProductErrorMsg("")
            this.isLoadingProductData(false)
            this.validProductCode(false)
            this.productErrorMsg("")
        }
    }

    buyProductModalEl.addEventListener('show.bs.modal', () => {
        buyProductVM.resetProductAll()
        resetProductAll()
    })
    buyProductModalEl.addEventListener('hide.bs.modal', () => {
        buyProductVM.resetProductAll()
        resetProductAll()
    })

    function resetProductAll() {
        document.querySelector("input[name=product-otp]").value = ""
        document.querySelectorAll("#product-otp-input>input").forEach((el, key) => el.value = "")
    }

    function resetAll() {
        document.querySelector("input[name=otp]").value = ""
        document.querySelectorAll("#otp-input>input").forEach((el, key) => el.value = "")

    }




    ko.applyBindings({...userDataVm, ...addCreditVm, ...userBalanceVM, ...buyProductVM})
});
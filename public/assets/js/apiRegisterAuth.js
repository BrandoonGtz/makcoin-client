document.addEventListener('DOMContentLoaded', function () {
    /*const axiosInstance = axios.create({
        baseUrl: apiServer,
        headers: {"Content-Type": "application/json", "Accept": "application/json"}
    })*/
    const token = localStorage.getItem("jwt")

    if (token !== null) {
        history.go(-history.length)
        window.location.replace(`${location.origin}/index.html`)
        return
    }
    const pswUtilVm = {
        isShowPsw: ko.observable(false),
        isShowConfirmPsw: ko.observable(false),
        toggleShowPsw: function (isConfirm) {
            if (isConfirm) {
                this.isShowConfirmPsw(!this.isShowConfirmPsw())
            } else {
                this.isShowPsw(!this.isShowPsw())
            }
        },
        showPswClass: "far fa-eye",
        notShowClass: "far fa-eye-slash",
    };

    const RegisterVM = {
        email: ko.observable(""),
        psw: ko.observable(""),
        confirmPsw: ko.observable(""),
        name: ko.observable(""),
        isDataSending: ko.observable(false),
        errorMsg: ko.observable(false),
        msg: ko.observable(""),
        register: function () {
            console.log("sending")
            this.errorMsg(false)
            this.msg("")
            if(this.psw() !== this.confirmPsw()){
                this.errorMsg(true)
                this.msg("Las contraseñas no coinciden")
                return
            }
            this.isDataSending(true)
            axios.post(`${apiServer}/auth/local/register`, {
                username: this.email(),
                password: this.psw(),
                email: this.email(),
                display_name: this.name()
            }).then((res) => {
                console.log(res)
                localStorage.setItem("jwt", res.data.jwt)
                history.go(-history.length)
                document.location.replace(`${window.location.origin}/index.html`)
                this.isDataSending(false)
            }).catch(e => {
                this.msg("Email ya registrado")
                this.isDataSending(false)
                this.errorMsg(true)
                console.log(e)
            })
        }
    }
    ko.applyBindings({...RegisterVM, ...pswUtilVm})

})
document.addEventListener('DOMContentLoaded', function () {

    const token = localStorage.getItem("jwt")
    console.log(token)
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

    const loginAuthVm = {
        email: ko.observable(""),
        password: ko.observable(""),
        isShowError: ko.observable(false),
        isDataSending: ko.observable(false),
        tryToLogin: function () {
            this.isDataSending(true)
            this.isShowError(false)
            axios.post(`${apiServer}/auth/local`, {
                identifier: this.email(),
                password: this.password()
            }).then(res => {
                this.isDataSending(false)
                localStorage.setItem("jwt", res.data.jwt)
                history.go(-history.length)
                document.location.replace(`${window.location.origin}/index.html`)
            }).catch(e => {
                this.isDataSending(false)
                this.isShowError(true)
            })
        }

    }
    ko.applyBindings({...loginAuthVm, ...pswUtilVm})
})
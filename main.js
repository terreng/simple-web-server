var config = {};

window.api.initipc(function (event, message) {
    config = message;
    document.body.style.display = "block";
});
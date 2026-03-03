// SIMPLE loader.js - Minimal version
window.loader = {
    show: (msg = "Loading...") => {
        console.log("Loader:", msg);
    },
    hide: () => {
        console.log("Loader hidden");
    }
};
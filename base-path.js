/* Pas de balise <base> — chemins relatifs natifs pour GitHub Pages */
(function () {
    window.getAzavisionAppUrl = function () {
        var path = window.location.pathname || '/';
        if (!path.endsWith('/')) {
            var file = path.split('/').pop() || '';
            path = file.indexOf('.') !== -1 ? path.slice(0, path.lastIndexOf('/') + 1) : path + '/';
        }
        return window.location.origin + path;
    };
})();

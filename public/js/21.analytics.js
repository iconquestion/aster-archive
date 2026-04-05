(function () {
    // 加载 gtag.js
    var script = document.createElement('script');
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=22-j4l4a7u8n2";
    document.head.appendChild(script);

    // 初始化 GA
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', '22-j4l4a7u8n2');
})();
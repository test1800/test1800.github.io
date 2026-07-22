const CACHE_NAME = "financial-dashboard-v1";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon.png"
];

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
    );

    self.skipWaiting();

});


self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(keys =>

            Promise.all(

                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))

            )

        )

    );

    self.clients.claim();

});


self.addEventListener("fetch", event => {

    const request = event.request;

    /*
    اطلاعات مالی همیشه از اینترنت دریافت شود
    */

    if (
        request.url.includes("data.json") ||
        request.url.includes("api")
    ) {

        event.respondWith(

            fetch(request)
                .catch(() => caches.match(request))

        );

        return;

    }


    /*
    سایر فایل‌ها:
    اول اینترنت، اگر اینترنت نبود کش
    */

    event.respondWith(

        fetch(request)

            .then(response => {

                const copy = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache =>
                        cache.put(request, copy)
                    );

                return response;

            })

            .catch(() =>
                caches.match(request)
            )

    );

});

const CACHE_NAME = "financial-dashboard-v3";

const STATIC_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon.png",
    "./data.json"
];


/* =====================================================
   INSTALL
===================================================== */

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)

            .then(cache => {

                return cache.addAll(STATIC_FILES);

            })

            .then(() => {

                return self.skipWaiting();

            })

    );

});


/* =====================================================
   ACTIVATE
===================================================== */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()

            .then(keys => {

                return Promise.all(

                    keys

                        .filter(key => key !== CACHE_NAME)

                        .map(key => caches.delete(key))

                );

            })

            .then(() => {

                return self.clients.claim();

            })

    );

});


/* =====================================================
   FETCH
===================================================== */

self.addEventListener("fetch", event => {

    const request = event.request;

    if (request.method !== "GET") {

        return;

    }

    const url = new URL(request.url);


    /*
       data.json
       Network First
       Offline => Cached Version
    */

    if (

        url.origin === self.location.origin

        &&

        url.pathname.endsWith("/data.json")

    ) {

        event.respondWith(

            networkFirst(request)

        );

        return;

    }


    /*
       External API
       Network First
       Offline => Cached Version
    */

    if (

        url.origin !== self.location.origin

    ) {

        event.respondWith(

            networkFirst(request)

        );

        return;

    }


    /*
       Local Files
       Cache First
    */

    event.respondWith(

        cacheFirst(request)

    );

});


/* =====================================================
   NETWORK FIRST
===================================================== */

async function networkFirst(request) {

    try {

        const response = await fetch(request);

        if (

            response

            &&

            response.ok

        ) {

            const cache = await caches.open(

                CACHE_NAME

            );

            await cache.put(

                request,

                response.clone()

            );

        }

        return response;

    }

    catch (error) {

        const cachedResponse = await caches.match(

            request

        );

        if (cachedResponse) {

            return cachedResponse;

        }

        throw error;

    }

}


/* =====================================================
   CACHE FIRST
===================================================== */

async function cacheFirst(request) {

    const cachedResponse = await caches.match(

        request

    );


    if (cachedResponse) {

        return cachedResponse;

    }


    const response = await fetch(request);


    if (

        response

        &&

        response.ok

    ) {

        const cache = await caches.open(

            CACHE_NAME

        );

        await cache.put(

            request,

            response.clone()

        );

    }


    return response;

}


/* =====================================================
   PUSH NOTIFICATION
===================================================== */

self.addEventListener(

    "push",

    event => {

        let data = {

            title: "Financial Dashboard",

            body: "Price Alert",

            icon: "./icon.png",

            badge: "./icon.png",

            url: "./index.html"

        };


        try {

            if (event.data) {

                data = {

                    ...data,

                    ...event.data.json()

                };

            }

        }

        catch (error) {

            console.error(

                "Push data error:",

                error

            );

        }


        const options = {

            body: data.body,

            icon: data.icon,

            badge: data.badge,

            vibrate: [

                200,

                100,

                200

            ],

            data: {

                url: data.url

            },

            tag: "financial-price-alert",

            renotify: true

        };


        event.waitUntil(

            self.registration.showNotification(

                data.title,

                options

            )

        );

    }

);


/* =====================================================
   NOTIFICATION CLICK
===================================================== */

self.addEventListener(

    "notificationclick",

    event => {

        event.notification.close();


        const url =

            event.notification.data

            &&

            event.notification.data.url

                ? event.notification.data.url

                : "./index.html";


        event.waitUntil(

            clients.matchAll({

                type: "window",

                includeUncontrolled: true

            })

            .then(

                clientList => {

                    for (

                        const client of clientList

                    ) {

                        if (

                            "focus" in client

                        ) {

                            client.navigate(url);

                            return client.focus();

                        }

                    }


                    if (

                        clients.openWindow

                    ) {

                        return clients.openWindow(

                            url

                        );

                    }

                }

            )

        );

    }

);

"use strict";

/* =====================================================
   CONFIGURATION
===================================================== */

const CACHE_NAME = "financial-dashboard-v5";

const STATIC_CACHE = `${CACHE_NAME}-static`;
const DATA_CACHE = `${CACHE_NAME}-data`;
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;

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

        caches.open(STATIC_CACHE)

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

    const validCaches = [

        STATIC_CACHE,
        DATA_CACHE,
        RUNTIME_CACHE

    ];

    event.waitUntil(

        caches.keys()

            .then(cacheNames => {

                return Promise.all(

                    cacheNames

                        .filter(cacheName => {

                            return (

                                cacheName.startsWith(
                                    "financial-dashboard-"
                                )

                                &&

                                !validCaches.includes(
                                    cacheName
                                )

                            );

                        })

                        .map(cacheName => {

                            return caches.delete(
                                cacheName
                            );

                        })

                );

            })

            .then(() => {

                return self.clients.claim();

            })

    );

});


/* =====================================================
   FETCH ROUTER
===================================================== */

self.addEventListener("fetch", event => {

    const request = event.request;


    /*
       فقط GET
    */

    if (request.method !== "GET") {

        return;

    }


    const url = new URL(request.url);


    /*
       Navigation
    */

    if (request.mode === "navigate") {

        event.respondWith(

            networkFirstNavigation(request)

        );

        return;

    }


    /*
       data.json
    */

    if (

        url.origin === self.location.origin

        &&

        url.pathname.endsWith("/data.json")

    ) {

        event.respondWith(

            networkFirstData(request)

        );

        return;

    }


    /*
       APIهای خارجی
       
       مهم:
       پاسخ API را دستکاری نمی‌کنیم.
       اگر API قطع باشد فقط همان API خطا می‌دهد
       و باعث Offline شدن کل صفحه نمی‌شود.
    */

    if (url.origin !== self.location.origin) {

        event.respondWith(

            fetch(request, {

                cache: "no-store",

                credentials: "omit"

            })

            .catch(() => {

                return new Response(

                    JSON.stringify({

                        error:
                            "External API unavailable"

                    }),

                    {

                        status: 503,

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Cache-Control":
                                "no-store"

                        }

                    }

                );

            })

        );

        return;

    }


    /*
       فایل‌های داخلی
    */

    event.respondWith(

        staleWhileRevalidate(request)

    );

});


/* =====================================================
   NAVIGATION
   NETWORK FIRST
===================================================== */

async function networkFirstNavigation(request) {

    try {

        const response = await fetch(request, {

            cache: "no-store"

        });


        if (response && response.ok) {

            const cache = await caches.open(
                STATIC_CACHE
            );

            await cache.put(
                request,
                response.clone()
            );

        }


        return response;

    }

    catch (error) {

        const cachedResponse =
            await caches.match(request);


        if (cachedResponse) {

            return cachedResponse;

        }


        const fallback =
            await caches.match("./index.html");


        if (fallback) {

            return fallback;

        }


        return new Response(

            "Offline",

            {

                status: 503,

                headers: {

                    "Content-Type":
                        "text/plain; charset=utf-8"

                }

            }

        );

    }

}


/* =====================================================
   DATA.JSON
   NETWORK FIRST
===================================================== */

async function networkFirstData(request) {

    try {

        const response = await fetch(

            request,

            {

                cache: "no-store"

            }

        );


        if (response && response.ok) {

            const cache = await caches.open(
                DATA_CACHE
            );


            await cache.put(

                request,

                response.clone()

            );

        }


        return response;

    }

    catch (error) {

        const cachedResponse =
            await caches.match(request);


        if (cachedResponse) {

            return cachedResponse;

        }


        return new Response(

            JSON.stringify({

                error: "Offline",

                message:
                    "Cached data is not available."

            }),

            {

                status: 503,

                headers: {

                    "Content-Type":
                        "application/json"

                }

            }

        );

    }

}


/* =====================================================
   STATIC FILES
   STALE WHILE REVALIDATE
===================================================== */

async function staleWhileRevalidate(request) {

    const cachedResponse =
        await caches.match(request);


    const networkResponse = fetch(

        request,

        {

            cache: "no-store"

        }

    )

        .then(async response => {


            if (

                response

                &&

                response.ok

            ) {

                const cache =
                    await caches.open(
                        RUNTIME_CACHE
                    );


                await cache.put(

                    request,

                    response.clone()

                );

            }


            return response;

        })

        .catch(() => {

            return null;

        });


    if (cachedResponse) {

        return cachedResponse;

    }


    const response =
        await networkResponse;


    if (response) {

        return response;

    }


    return new Response(

        "Resource unavailable",

        {

            status: 503,

            headers: {

                "Content-Type":
                    "text/plain; charset=utf-8"

            }

        }

    );

}


/* =====================================================
   PUSH NOTIFICATION
===================================================== */

self.addEventListener(

    "push",

    event => {

        let data = {

            title:
                "Financial Dashboard",

            body:
                "Price Alert",

            icon:
                "./icon.png",

            badge:
                "./icon.png",

            url:
                "./index.html"

        };


        try {

            if (event.data) {

                const payload =
                    event.data.json();


                data = {

                    ...data,

                    ...payload

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

            body:
                data.body,

            icon:
                data.icon,

            badge:
                data.badge,

            vibrate: [

                200,

                100,

                200

            ],

            tag:
                "financial-price-alert",

            renotify:
                true,

            data: {

                url:
                    data.url

            }

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


        const targetUrl =

            event.notification

            &&

            event.notification.data

            &&

            event.notification.data.url

                ? event.notification.data.url

                : "./index.html";


        event.waitUntil(

            clients.matchAll({

                type:
                    "window",

                includeUncontrolled:
                    true

            })

            .then(clientList => {

                for (

                    const client of clientList

                ) {

                    if ("focus" in client) {

                        client.navigate(
                            targetUrl
                        );

                        return client.focus();

                    }

                }


                if (clients.openWindow) {

                    return clients.openWindow(
                        targetUrl
                    );

                }

            })

        );

    }

);

const CACHE_NAME = "financial-dashboard-v4";

const STATIC_CACHE = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon.png"
];

const DATA_CACHE_KEY = "./data.json";


/* =====================================================
   INSTALL
===================================================== */

self.addEventListener(

    "install",

    event => {

        event.waitUntil(

            caches.open(

                CACHE_NAME

            )

            .then(

                cache =>

                    cache.addAll(

                        STATIC_CACHE

                    )

            )

            .then(

                () =>

                    self.skipWaiting()

            )

        );

    }

);


/* =====================================================
   ACTIVATE
===================================================== */

self.addEventListener(

    "activate",

    event => {

        event.waitUntil(

            caches.keys()

                .then(

                    cacheNames => {

                        return Promise.all(

                            cacheNames

                                .filter(

                                    cacheName =>

                                        cacheName !== CACHE_NAME

                                )

                                .map(

                                    cacheName =>

                                        caches.delete(

                                            cacheName

                                        )

                                )

                        );

                    }

                )

                .then(

                    () =>

                        self.clients.claim()

                )

        );

    }

);


/* =====================================================
   FETCH ROUTER
===================================================== */

self.addEventListener(

    "fetch",

    event => {

        const request = event.request;


        if (

            request.method !== "GET"

        ) {

            return;

        }


        const url = new URL(

            request.url

        );


        /*
           SERVICE WORKER
           همیشه از Network
        */

        if (

            url.pathname.endsWith(

                "/sw.js"

            )

        ) {

            event.respondWith(

                fetch(

                    request,

                    {

                        cache:

                            "no-store"

                    }

                )

            );

            return;

        }


        /*
           DATA.JSON
           Network First
           Cache Fallback
        */

        if (

            url.origin ===

            self.location.origin

            &&

            url.pathname.endsWith(

                "/data.json"

            )

        ) {

            event.respondWith(

                networkFirstData()

            );

            return;

        }


        /*
           EXTERNAL API
           Network Only
           بدون Cache
        */

        if (

            url.origin !==

            self.location.origin

        ) {

            event.respondWith(

                networkOnly(

                    request

                )

            );

            return;

        }


        /*
           HTML DOCUMENT
           Network First
           Cache Fallback
        */

        if (

            request.mode ===

            "navigate"

            ||

            request.destination ===

            "document"

        ) {

            event.respondWith(

                networkFirst(

                    request

                )

            );

            return;

        }


        /*
           STATIC FILES
           Cache First
        */

        event.respondWith(

            cacheFirst(

                request

            )

        );

    }

);


/* =====================================================
   NETWORK ONLY
===================================================== */

async function networkOnly(

    request

) {

    return fetch(

        request

    );

}


/* =====================================================
   NETWORK FIRST
===================================================== */

async function networkFirst(

    request

) {

    try {

        const response =

            await fetch(

                request,

                {

                    cache:

                        "no-store"

                }

            );


        if (

            response

            &&

            response.ok

        ) {

            const cache =

                await caches.open(

                    CACHE_NAME

                );


            await cache.put(

                request,

                response.clone()

            );

        }


        return response;

    }

    catch (

        error

    ) {

        const cachedResponse =

            await caches.match(

                request

            );


        if (

            cachedResponse

        ) {

            return cachedResponse;

        }


        throw error;

    }

}


/* =====================================================
   DATA.JSON NETWORK FIRST
===================================================== */

async function networkFirstData() {

    const cache =

        await caches.open(

            CACHE_NAME

        );


    const cacheKey =

        new Request(

            DATA_CACHE_KEY

        );


    try {

        const response =

            await fetch(

                DATA_CACHE_KEY

                +

                "?v="

                +

                Date.now(),

                {

                    cache:

                        "no-store"

                }

            );


        if (

            response

            &&

            response.ok

        ) {

            await cache.put(

                cacheKey,

                response.clone()

            );

        }


        return response;

    }

    catch (

        error

    ) {

        const cachedResponse =

            await cache.match(

                cacheKey

            );


        if (

            cachedResponse

        ) {

            return cachedResponse;

        }


        throw error;

    }

}


/* =====================================================
   CACHE FIRST
===================================================== */

async function cacheFirst(

    request

) {

    const cachedResponse =

        await caches.match(

            request

        );


    if (

        cachedResponse

    ) {

        return cachedResponse;

    }


    const response =

        await fetch(

            request

        );


    if (

        response

        &&

        response.ok

    ) {

        const cache =

            await caches.open(

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

            if (

                event.data

            ) {

                try {

                    data = {

                        ...data,

                        ...event.data.json()

                    };

                }

                catch (

                    jsonError

                ) {

                    data.body =

                        event.data.text();

                }

            }

        }

        catch (

            error

        ) {

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

            vibrate:

                [

                    200,

                    100,

                    200

                ],

            data: {

                url:

                    data.url

            },

            tag:

                "financial-price-alert",

            renotify:

                true

        };


        event.waitUntil(

            self.registration

                .showNotification(

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


        const relativeUrl =

            event.notification

                .data

                &&

            event.notification.data.url

                ?

            event.notification.data.url

                :

            "./index.html";


        const targetUrl =

            new URL(

                relativeUrl,

                self.registration.scope

            ).href;


        event.waitUntil(

            clients.matchAll(

                {

                    type:

                        "window",

                    includeUncontrolled:

                        true

                }

            )

            .then(

                clientList => {

                    for (

                        const client

                        of

                        clientList

                    ) {

                        if (

                            client.url

                            ===

                            targetUrl

                            &&

                            "focus"

                            in

                            client

                        ) {

                            return client.focus();

                        }

                    }


                    for (

                        const client

                        of

                        clientList

                    ) {

                        if (

                            "navigate"

                            in

                            client

                        )

                        {

                            return client

                                .navigate(

                                    targetUrl

                                )

                                .then(

                                    () =>

                                        client.focus()

                                );

                        }

                    }


                    if (

                        clients.openWindow

                    ) {

                        return clients.openWindow(

                            targetUrl

                        );

                    }

                }

            )

        );

    }

);

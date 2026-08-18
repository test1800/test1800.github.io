const CACHE_NAME = "financial-dashboard-v4";

const STATIC_FILES = [

    "./",

    "./index.html",

    "./manifest.json",

    "./icon.png",

    "./icon-192.png",

    "./icon-512.png",

    "./data.json"

];



self.addEventListener(

    "install",

    event => {

        event.waitUntil(

            caches.open(

                CACHE_NAME

            )

            .then(

                async cache => {

                    for (

                        const file

                        of STATIC_FILES

                    ) {

                        try {

                            await cache.add(

                                file

                            );

                        }

                        catch (error) {

                            console.warn(

                                "Cache skipped:",

                                file

                            );

                        }

                    }

                }

            )

            .then(

                () =>

                    self.skipWaiting()

            )

        );

    }

);



self.addEventListener(

    "activate",

    event => {

        event.waitUntil(

            caches.keys()

                .then(

                    keys =>

                        Promise.all(

                            keys

                                .filter(

                                    key =>

                                        key !== CACHE_NAME

                                )

                                .map(

                                    key =>

                                        caches.delete(

                                            key

                                        )

                                )

                        )

                )

                .then(

                    () =>

                        self.clients.claim()

                )

        );

    }

);



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

            DATA.JSON

            Always network first
            Offline => cache

        */

        if (

            url.origin === self.location.origin

            &&

            url.pathname.endsWith(

                "/data.json"

            )

        ) {

            event.respondWith(

                networkFirst(

                    request

                )

            );

            return;

        }



        /*

            External APIs

            Network first
            Offline => cached response

        */

        if (

            url.origin !== self.location.origin

        ) {

            event.respondWith(

                networkFirst(

                    request

                )

            );

            return;

        }



        /*

            Local files

            Cache first
            Network fallback

        */

        event.respondWith(

            cacheFirst(

                request

            )

        );


    }

);



/* =====================================================
   NETWORK FIRST
===================================================== */

async function networkFirst(

    request

) {

    try {


        const response = await fetch(

            request

        );



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

    const cachedResponse = await caches.match(

        request

    );


    if (

        cachedResponse

    ) {

        return cachedResponse;

    }



    const response = await fetch(

        request

    );



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
   Background / PWA / Mobile
===================================================== */

self.addEventListener(

    "push",

    event => {

        let payload = {};

        try {

            if (

                event.data

            ) {

                payload =
                    event.data.json();

            }

        }

        catch (error) {

            try {

                payload = {

                    body:
                        event.data
                            ? event.data.text()
                            : ""

                };

            }

            catch (textError) {

                payload = {};

            }

        }



        const title =
            payload.title ||

            "Financial Dashboard";



        const body =
            payload.body ||

            payload.message ||

            "New notification";



        const icon =
            payload.icon ||

            "./icon-192.png";



        const badge =
            payload.badge ||

            "./icon-192.png";



        const tag =
            payload.tag ||

            `financial-dashboard-${Date.now()}`;



        const notificationOptions = {

            body: body,

            icon: icon,

            badge: badge,



            tag: tag,



            renotify: true,



            requireInteraction: true,



            silent: false,



            vibrate: [

                120,

                70,

                120

            ],



            data: {

                url:
                    payload.url ||

                    "./",



                notificationType:
                    payload.notificationType ||

                    "USD"

            }

        };



        event.waitUntil(

            self.registration.showNotification(

                title,

                notificationOptions

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

        const notification =
            event.notification;



        const notificationData =
            notification.data || {};



        const targetUrl =
            notificationData.url ||

            "./";



        notification.close();



        event.waitUntil(

            clients.matchAll({

                type: "window",

                includeUncontrolled: true

            })

            .then(

                clientList => {

                    for (

                        const client

                        of clientList

                    ) {

                        try {

                            const clientUrl =
                                new URL(
                                    client.url
                                );

                            const target =
                                new URL(
                                    targetUrl,
                                    self.location.origin
                                );



                            if (

                                clientUrl.origin ===

                                target.origin

                            ) {

                                if (

                                    "focus" in client

                                ) {

                                    return client.focus();

                                }

                            }

                        }

                        catch (error) {}

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



/* =====================================================
   NOTIFICATION CLOSE
===================================================== */

self.addEventListener(

    "notificationclose",

    event => {

        /*

            Intentionally kept empty.

            This event is available for future
            notification analytics if needed.

        */

    }

);

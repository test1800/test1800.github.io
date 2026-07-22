const CACHE_NAME = "financial-dashboard-v2";

const STATIC_FILES = [

    "./",

    "./index.html",

    "./manifest.json",

    "./icon.png",

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

                cache =>

                    cache.addAll(

                        STATIC_FILES

                    )

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

                                        key !==

                                        CACHE_NAME

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

        const request =

            event.request;


        if (

            request.method !==

            "GET"

        ) {

            return;

        }


        const url =

            new URL(

                request.url

            );


        /*

           API PRICE:

           Always try network first.

           If offline, use cached API response.

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

                networkFirst(

                    request

                )

            );

            return;

        }


        /*

           External API:

           Network first.

           Offline => last cached response.

        */

        if (

            url.origin !==

            self.location.origin

        ) {

            event.respondWith(

                networkFirst(

                    request

                )

            );

            return;

        }


        /*

           HTML / CSS / JS / ICON:

           Cache first.

           If not available, try network.

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

    catch (error) {

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

/* =====================================================
   EMAIL NOTIFICATION
   Financial Dashboard → Cloudflare Worker
===================================================== */


/*
   Cloudflare Worker URL

   فعلاً خالی است.
   بعداً آدرس Worker را اینجا قرار می‌دهیم.
*/

const EMAIL_WORKER_URL =
    "https://email.rxw.workers.dev/";


/* =====================================================
   SEND EMAIL NOTIFICATION
===================================================== */

async function sendEmailNotification(
    title,
    message
) {

    /*
       Worker URL هنوز تنظیم نشده
    */

    if (!EMAIL_WORKER_URL) {

        console.warn(
            "Email notification skipped: Worker URL is not configured."
        );

        return false;
    }


    try {

        const response =
            await fetch(
                EMAIL_WORKER_URL,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            title:
                                String(title),

                            message:
                                String(message)

                        })

                }
            );


        if (!response.ok) {

            console.warn(
                "Email notification failed:",
                response.status
            );

            return false;
        }


        console.log(
            "Email notification sent:",
            title,
            message
        );


        return true;

    }

    catch (error) {

        console.warn(
            "Email notification error:",
            error
        );

        return false;
    }
}

import json
import os
import requests
from datetime import datetime, timezone

# =====================================================
# SETTINGS
# =====================================================

API_URL = "https://api.nobitex.ir/market/stats"

HISTORY_FILE = "price_history.json"

# مقدار تغییر هشدار
ALERT_PERCENT = 1.0

# مقایسه با حدود 1 ساعت قبل
COMPARE_MINUTES = 60

# نگهداری حداکثر 2 ساعت داده
KEEP_MINUTES = 120

# اگر قیمت نوبیتکس در دسترس نبود
# برنامه بدون خطا پایان پیدا می کند
FAIL_SILENT = True


# =====================================================
# GET PRICE
# =====================================================

def get_price():

    try:

        response = requests.get(
            API_URL,
            params={
                "srcCurrency": "usdt",
                "dstCurrency": "rls"
            },
            headers={
                "User-Agent": "Mozilla/5.0"
            },
            timeout=20
        )

        response.raise_for_status()

        data = response.json()

        price = data["stats"]["usdt-rls"]["latest"]

        price = float(price)

        # تبدیل ریال به تومان
        price = price / 10

        return price

    except Exception as e:

        print("WARNING: Unable to get price from Nobitex API")

        print(repr(e))

        if FAIL_SILENT:
            return None

        raise


# =====================================================
# LOAD HISTORY
# =====================================================

def load_history():

    if not os.path.exists(HISTORY_FILE):

        return []

    try:

        with open(
            HISTORY_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

            if isinstance(data, list):
                return data

            return []

    except Exception as e:

        print("WARNING: Cannot read price history")

        print(repr(e))

        return []


# =====================================================
# SAVE HISTORY
# =====================================================

def save_history(history):

    with open(
        HISTORY_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            history,
            file,
            ensure_ascii=False,
            indent=2
        )


# =====================================================
# FIND PRICE FROM 1 HOUR AGO
# =====================================================

def find_old_price(history):

    if not history:

        return None

    now = datetime.now(timezone.utc)

    target_timestamp = (

        now.timestamp()

        -

        COMPARE_MINUTES * 60

    )

    closest = None

    closest_difference = None

    for item in history:

        try:

            timestamp = float(
                item["timestamp"]
            )

            difference = abs(

                timestamp

                -

                target_timestamp

            )

            if (

                closest is None

                or

                difference < closest_difference

            ):

                closest = item

                closest_difference = difference

        except Exception:

            continue

    if closest is None:

        return None

    # حداقل حدود 50 دقیقه از داده گذشته باشد
    if closest_difference > 10 * 60:

        return None

    return float(
        closest["price"]
    )


# =====================================================
# CALCULATE CHANGE
# =====================================================

def calculate_change(

    current_price,

    old_price

):

    if (

        old_price is None

        or

        old_price == 0

    ):

        return None

    return (

        (

            current_price

            -

            old_price

        )

        /

        old_price

    ) * 100


# =====================================================
# MAIN
# =====================================================

def main():

    print("=" * 50)

    print("PRICE CHECK STARTED")

    print("=" * 50)


    # -----------------------------------------------
    # GET CURRENT PRICE
    # -----------------------------------------------

    current_price = get_price()


    if current_price is None:

        print(
            "No new price received."
        )

        print(
            "Keeping existing history."
        )

        print(
            "Workflow will finish successfully."
        )

        return


    print(
        f"Current price: {current_price:,.0f}"
    )


    # -----------------------------------------------
    # LOAD HISTORY
    # -----------------------------------------------

    history = load_history()


    # -----------------------------------------------
    # FIND 1 HOUR OLD PRICE
    # -----------------------------------------------

    old_price = find_old_price(
        history
    )


    change_percent = calculate_change(

        current_price,

        old_price

    )


    if change_percent is not None:

        print(

            f"Price about 1 hour ago: "
            f"{old_price:,.0f}"

        )

        print(

            f"Change: "
            f"{change_percent:+.2f}%"

        )

    else:

        print(
            "Not enough historical data "
            "for 1-hour comparison."
        )


    # -----------------------------------------------
    # SAVE CURRENT PRICE
    # -----------------------------------------------

    now = datetime.now(
        timezone.utc
    )

    new_record = {

        "timestamp":
            now.timestamp(),

        "time":
            now.isoformat(),

        "price":
            current_price

    }


    history.append(
        new_record
    )


    # -----------------------------------------------
    # DELETE DATA OLDER THAN 2 HOURS
    # -----------------------------------------------

    cutoff = (

        now.timestamp()

        -

        KEEP_MINUTES * 60

    )


    history = [

        item

        for item in history

        if float(

            item.get(
                "timestamp",
                0
            )

        ) >= cutoff

    ]


    # -----------------------------------------------
    # SAVE
    # -----------------------------------------------

    save_history(
        history
    )


    print(

        f"History records: "
        f"{len(history)}"

    )


    # -----------------------------------------------
    # ALERT
    # -----------------------------------------------

    if (

        change_percent is not None

        and

        abs(change_percent)

        >=

        ALERT_PERCENT

    ):

        print("")

        print("🚨 PRICE ALERT")

        print(

            f"Current price: "
            f"{current_price:,.0f}"

        )

        print(

            f"1 hour ago: "
            f"{old_price:,.0f}"

        )

        print(

            f"Change: "
            f"{change_percent:+.2f}%"

        )

        print("")

        # -------------------------------------------
        # TELEGRAM WILL BE ADDED HERE
        # -------------------------------------------

        # send_telegram_alert(
        #     current_price,
        #     old_price,
        #     change_percent
        # )

    else:

        print(

            "No significant price change."

        )


    print("")

    print(
        "PRICE CHECK COMPLETED SUCCESSFULLY"
    )


# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":

    main()

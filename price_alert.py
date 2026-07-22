import json
import os
import time
from datetime import datetime, timezone

import requests


# =========================================================
# SETTINGS
# =========================================================

PRICE_API = os.environ.get(
    "PRICE_API",
    "https://api.nobitex.ir/v2/orderbook/USDTIRT"
)

HISTORY_FILE = "price_history.json"

# تغییر شدید قیمت
ALERT_PERCENT = 1.0

# فاصله مقایسه: حدود 1 ساعت
COMPARE_SECONDS = 60 * 60

# فقط 2 ساعت اخیر نگهداری شود
MAX_HISTORY_SECONDS = 2 * 60 * 60


# =========================================================
# GET CURRENT PRICE
# =========================================================

def get_current_price():

    response = requests.get(
        PRICE_API,
        timeout=20
    )

    response.raise_for_status()

    data = response.json()

    # قیمت آخرین معامله
    if "lastTradePrice" in data:
        price = float(data["lastTradePrice"])

    # پشتیبانی از ساختارهای دیگر API
    elif "last" in data:
        price = float(data["last"])

    elif "lastPrice" in data:
        price = float(data["lastPrice"])

    else:
        raise ValueError(
            "Could not find current price in API response"
        )

    return price


# =========================================================
# LOAD HISTORY
# =========================================================

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

    except Exception:

        return []


# =========================================================
# SAVE HISTORY
# =========================================================

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


# =========================================================
# FIND PRICE FROM ABOUT 1 HOUR AGO
# =========================================================

def find_old_price(
    history,
    current_timestamp
):

    target_timestamp = (

        current_timestamp

        - COMPARE_SECONDS

    )

    if not history:

        return None

    closest = None

    closest_difference = None

    for item in history:

        try:

            timestamp = float(
                item["timestamp"]
            )

            price = float(
                item["price"]
            )

        except Exception:

            continue

        difference = abs(

            timestamp

            - target_timestamp

        )

        # فقط داده‌های حداکثر 10 دقیقه
        # دور از نقطه یک ساعت قبل قبول شوند

        if difference <= 10 * 60:

            if (

                closest_difference is None

                or

                difference < closest_difference

            ):

                closest = price

                closest_difference = difference

    return closest


# =========================================================
# MAIN
# =========================================================

def main():

    now = time.time()

    now_iso = datetime.now(
        timezone.utc
    ).isoformat()

    print(
        "Getting current USDT price..."
    )

    current_price = get_current_price()

    print(
        f"Current price: {current_price}"
    )

    history = load_history()


    # =====================================================
    # REMOVE DATA OLDER THAN 2 HOURS
    # =====================================================

    history = [

        item

        for item in history

        if (

            isinstance(item, dict)

            and

            float(
                item.get(
                    "timestamp",
                    0
                )
            )

            >=

            now

            - MAX_HISTORY_SECONDS

        )

    ]


    # =====================================================
    # FIND PRICE 1 HOUR AGO
    # =====================================================

    old_price = find_old_price(

        history,

        now

    )


    # =====================================================
    # CALCULATE CHANGE
    # =====================================================

    change_percent = None

    if (

        old_price is not None

        and

        old_price > 0

    ):

        change_percent = (

            (

                current_price

                -

                old_price

            )

            /

            old_price

        ) * 100


        print(

            f"Price 1 hour ago: {old_price}"

        )

        print(

            f"Change: {change_percent:.3f}%"

        )


    else:

        print(

            "Not enough historical data yet."

        )


    # =====================================================
    # ADD CURRENT PRICE
    # =====================================================

    history.append(

        {

            "timestamp":
                now,

            "datetime":
                now_iso,

            "price":
                current_price

        }

    )


    # =====================================================
    # KEEP ONLY LAST 2 HOURS
    # =====================================================

    history = [

        item

        for item in history

        if (

            now

            -

            float(
                item["timestamp"]
            )

            <=

            MAX_HISTORY_SECONDS

        )

    ]


    # =====================================================
    # SAVE
    # =====================================================

    save_history(

        history

    )


    # =====================================================
    # ALERT CONDITION
    # =====================================================

    if (

        change_percent is not None

        and

        abs(change_percent)

        >=

        ALERT_PERCENT

    ):

        if change_percent > 0:

            direction = "UP"

        else:

            direction = "DOWN"


        print(

            "===================================="

        )

        print(

            "🚨 PRICE ALERT"

        )

        print(

            f"Direction: {direction}"

        )

        print(

            f"Current: {current_price}"

        )

        print(

            f"1 hour ago: {old_price}"

        )

        print(

            f"Change: {change_percent:.2f}%"

        )

        print(

            "===================================="

        )

        # فعلاً فقط هشدار در لاگ GitHub Actions

        # مرحله بعد Push Notification را اضافه می‌کنیم

    else:

        print(

            "No significant price change."

        )


if __name__ == "__main__":

    main()

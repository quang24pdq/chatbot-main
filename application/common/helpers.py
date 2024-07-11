#!/usr/bin/env python
# -*- coding: utf-8 -*-
import re
import pytz
import time
import copy
import random
import string
import hashlib
import phonenumbers
from copy import deepcopy
from dateutil import tz
import dateutil.relativedelta
from datetime import datetime, date, timedelta
from phonenumbers import carrier
from phonenumbers.phonenumberutil import number_type
from jinja2 import Environment, BaseLoader, Undefined


# INTERNATIONAL PHONE DETECTOR
# VALUE INPUT MUST START WITH (+) LIKE +84...
def phone_detector(input_value):
    try:
        if carrier._is_mobile(number_type(phonenumbers.parse(input_value))) == True:
            return input_value
        else:
            return None
    except:
        return None


def phone_regex(phone_string):
    try:
        p = re.compile(r"[\\/. ,_+=;:'\-*%&\s]")
        chars = p.findall(phone_string)
        for c in chars:
            phone_string = phone_string.replace(c, "")
        return phone_string
    except:
        return phone_string


def current_local_datetime():
    utcnow = datetime.utcnow()
    today = utcnow + dateutil.relativedelta.relativedelta(hours=7)
    return today


def get_utc_from_local_datetime(time):
    utc = time + dateutil.relativedelta.relativedelta(hours=-7)
    return utc


def get_days_from_date(today, delta):
    return today - timedelta(days=delta)


def validate_phone(input_string):
    string_format = convert_phone_number(input_string, "+84")
    string_format = str(string_format).replace(" ", "")
    phone = phone_detector(string_format)
    if phone is None:
        return False
    return True


def validate_gender(value):
    gender = None
    if value is not None and value != "" and value.strip() != "":
        if value.lower() == 'male' or value.lower() == 'anh' or value.lower() == 'nam'\
                or value.lower() == 'ông' or value.lower() == 'ngài' or str(value) == "1":
            gender = 'Anh'
        elif value.lower() == 'female' or value.lower() == 'chị' or value.lower() == 'chi'\
            or value.lower() == 'nữ' or value.lower() == 'nu' or value.lower() == 'bà' or str(value) == "0":
            gender = 'Chị'

    return gender


def check_text_rule(incomemessage, rule_texts):
    for txt in rule_texts:
        if (txt is not None) and (incomemessage.lower().strip() == txt.lower().strip()):
            return True
    return False


def get_milisecond(date_time):
    return round(date_time.timestamp() * 1000)


##
# GET NOW TIMESTAMP
##
def now_timestamp(milisecond=True):
    if milisecond == True:
        return round(time.time() * 1000)
    else:
        return round(time.time())


def get_datetime_timezone(timestamp, timezone='Asia/Ho_Chi_Minh'):
    return datetime.fromtimestamp(timestamp/1000, tz=pytz.timezone(timezone))


# change phone format
def convert_phone_number(phone, output_type="0"):
    tmp_phone = str(phone)
    output_type = str(output_type)
    if output_type == 0 or output_type == "0":
        if tmp_phone.startswith("0") == True:
            pass
        elif tmp_phone.startswith("84") == True:
            tmp_phone = tmp_phone.replace("84", "0", 1)
        elif tmp_phone.startswith("+84") == True:
            tmp_phone = tmp_phone.replace("+84", "0", 1)
        elif tmp_phone.startswith("1") or tmp_phone.startswith("2") or tmp_phone.startswith("3")\
                or tmp_phone.startswith("4") or tmp_phone.startswith("5") or tmp_phone.startswith("6")\
                or tmp_phone.startswith("7") or tmp_phone.startswith("8") or tmp_phone.startswith("9"):
            tmp_phone = output_type + tmp_phone
        else:
            return None
        return tmp_phone

    elif output_type == 84 or output_type == "84":
        if tmp_phone.startswith("84") == True:
            pass
        elif tmp_phone.startswith("0") == True:
            tmp_phone = tmp_phone.replace("0", "84", 1)
        elif tmp_phone.startswith("+84") == True:
            tmp_phone = tmp_phone.replace("+84", "84", 1)
        elif tmp_phone.startswith("1") or tmp_phone.startswith("2") or tmp_phone.startswith("3")\
                or tmp_phone.startswith("4") or tmp_phone.startswith("5") or tmp_phone.startswith("6")\
                or tmp_phone.startswith("7") or tmp_phone.startswith("8") or tmp_phone.startswith("9"):
            tmp_phone = output_type + tmp_phone
        else:
            return None
        return tmp_phone

    elif output_type == "+84":
        if tmp_phone.startswith("+84") == True:
            pass
        elif tmp_phone.startswith("0") == True:
            tmp_phone = tmp_phone.replace("0", "+84", 1)
        elif tmp_phone.startswith("84") == True:
            tmp_phone = tmp_phone.replace("84", "+84", 1)
        elif tmp_phone.startswith("1") or tmp_phone.startswith("2") or tmp_phone.startswith("3")\
                or tmp_phone.startswith("4") or tmp_phone.startswith("5") or tmp_phone.startswith("6")\
                or tmp_phone.startswith("7") or tmp_phone.startswith("8") or tmp_phone.startswith("9"):
            tmp_phone = output_type + tmp_phone
        else:
            return None
        return tmp_phone

    else:
        return None


# change datetime format
def convert_datetime_format(input_datetime, outFormat=None):
    try:
        find_input_date = date_detector(input_datetime)

        if find_input_date is not None:
            if outFormat == None:
                outFormat = "%Y-%m-%d %H:%M:%S"

            return find_input_date.__format__(outFormat)

        return None
    except:
        return None


# get day of week of time
# @default datetime.now()
def get_day_of_week(value=datetime.now()):
    return datetime.strptime(value).weekday()


def get_local_today(timezone=7):
    today = datetime.utcnow() + dateutil.relativedelta.relativedelta(hours=timezone)

    return today


#
# covered cases: 94, 01, 1994, 2001
# consider cases: 201 (2001)
#
def year_detector(year_tail):
    today = datetime.now()
    current_year = today.year
    try:
        if year_tail is None or year_tail == "":
            return current_year

        if int(year_tail) > 1000:
            return int(year_tail)

        year_tail = str(year_tail)
        if len(year_tail) == 1:
            year_tail = "0" + year_tail
        elif len(year_tail) >= 3:
            return current_year

        isCorrect = False

        year_header = 0
        while isCorrect == False:

            # user must be > 10 year olds and <= 100 year olds
            if int(year_tail) < 100 and (current_year - int(str(year_header) + year_tail) <= 100)\
                    and (current_year - int(str(year_header) + year_tail) > 10):
                isCorrect = True
                break

            year_header += 1

        return int(str(year_header) + year_tail)
    except:
        return current_year


#
# detect & replace it into "-"
#
def detect_separator(datetime_str):
    try:
        p = re.compile(r"[\\/.,_+=;:'\*%&\s]")

        chars = p.findall(datetime_str)

        for c in chars:
            datetime_str = datetime_str.replace(c, "-")

        return datetime_str
    except:
        return datetime_str



def date_detector(inputdate):
    try:
        if inputdate is None or inputdate == "":
            return None

        if isinstance(inputdate, datetime):
            inputdate = inputdate.__format__("%Y-%m-%d %H:%M:%S")
        else:
            if str(inputdate).find("T") >= 0:
                inputdate = str(inputdate).replace("T", " ")
            else:
                inputdate = str(inputdate)

        date_str = ""
        time_str = ""

        if (inputdate.strip()).find(" ", 7) >= 0:
            date_str = inputdate[:inputdate.index(" ")]
            time_str = inputdate[inputdate.index(" ") + 1:]
        else:
            date_str = inputdate
            time_str = "00:00:00"

        # 00:59:59.999
        if time_str.find(".") >= 0 and time_str.index(".") > 2:
            time_str = time_str[:time_str.index(".")]
        # 00.59.59.999
        elif time_str.find(".") >= 0 and time_str.find(".", 8) >= 0:
            time_str = time_str[:time_str.index(".", 8)]

        out_date = None

        date_str = detect_separator(date_str)
        if date_str.find("-") >= 0:

            y = date_str[(date_str.rfind("-") + 1):]

#             if 1 <= len(y) <= 2:
#                 fullyear = year_detector(y)
#                 date_str = date_str[:(date_str.rfind("-")+1)] + str(fullyear)

            datetime_str = date_str + " " + time_str

            try:
                out_date = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
            except:
                try:
                    out_date = datetime.strptime(
                        datetime_str, "%d-%m-%Y %H:%M:%S")
                except:
                    try:
                        out_date = datetime.strptime(
                            datetime_str, "%Y-%d-%m %H:%M:%S")
                    except:
                        try:
                            out_date = datetime.strptime(
                                datetime_str, "%m-%d-%Y %H:%M:%S")
                        except:
                            out_date = None

        # 01012018, 112018, 1212018, 1102018
        else:
            date_str = date_str.strip()
            y = 0
            m = 0
            d = 0

            if len(date_str) == len("01012018"):
                d = date_str[:2]
                m = date_str[2:][:2]
                y = date_str[4:]
            # 5122018, 2512018
            elif len(date_str) == len("01012018") - 1:
                d = None
                m = None
                y = None
                if int(date_str[1:][:2]) > 12:
                    d = date_str[:2]
                    m = date_str[2:][:1]
                    y = date_str[3:]

                elif int(date_str[1:][:2]) <= 12 and int(date_str[:2]) > 31:
                    d = date_str[:1]
                    m = date_str[1:][:2]
                    y = date_str[3:]

                else:
                    try:
                        d = date_str[:2]
                        m = date_str[2:][:1]
                        y = date_str[3:]
                        test = datetime(int(y), int(m), int(d))
                    except:
                        try:
                            d = date_str[:1]
                            m = date_str[1:][:2]
                            y = date_str[3:]
                            test = datetime(int(y), int(m), int(d))
                        except:
                            pass

            # 112018, 251295
            elif len(date_str) == len("01012018") - 2:
                # 311299
                if int(date_str[-4:]) <= 1299:
                    y = str(year_detector(date_str[-2:]))
                    m = date_str[2:][:2]
                    d = date_str[:2]

                else:
                    d = date_str[:1]
                    m = date_str[1:][:1]
                    y = str(year_detector(date_str[2:]))

            elif len(date_str) == len("01012018") - 3:
                # 25795
                y = str(year_detector(date_str[-2:]))
                if int(date_str[1:][:2]) > 12:
                    m = date_str[2:][:1]
                    d = date_str[:2]
                else:
                    m = date_str[1:][:2]
                    d = date_str[:1]

            else:
                # 2501 -> 25-01-2018
                if int(date_str[2:][:2]) <= 12:
                    d = date_str[:2]
                    m = date_str[2:][:2]
                    y = str(year_detector(None))
                else:
                    # 1594 -> 01-05-1994
                    d = date_str[:1]
                    m = date_str[1:][:1]
                    y = str(year_detector(date_str[-2:]))

            if y == 0 or m == 0 or d == 0:
                return None

            datetime_str = str(y) + "-" + str(m) + "-" + \
                str(d) + " " + time_str

            out_date = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")

        return out_date

    except:
        return None


def convert_template(text, objectData):
    for key in objectData.keys():
        if not isinstance(objectData[key], dict) or not isinstance(objectData[key], list):
            text = text.replace("{{"+key+"}}", str(objectData[key]))
        if isinstance(objectData[key], dict):
            text = convert_template(text, objectData[key])
        if isinstance(objectData[key], list):
            pass
    return text


def merge_objects(sourceObject, targetObject, save_target_attrs=True):
    sourceObject = copy.deepcopy(
        sourceObject) if sourceObject is not None else {}
    targetObject = copy.deepcopy(
        targetObject) if targetObject is not None else {}
    for key in sourceObject.keys():
        if key == "_id" or key == "id":
            continue

        if save_target_attrs == True:
            if key not in targetObject or targetObject.get(key, None) is None or targetObject.get(key, "") == "":
                targetObject[key] = sourceObject[key]
        else:
            if key in sourceObject and sourceObject[key] is not None and sourceObject[key] != "":
                targetObject[key] = sourceObject[key]
    return targetObject


def hash_keys(length=64):
    code = ''.join(random.choice(string.ascii_lowercase + string.ascii_uppercase + string.digits + string.digits + "----")
                   for _ in range(length))
    return code


def generate_unique_key(lenght=32, upper=False):
    code = ''
    if upper == False:
        code = ''.join(random.choice(string.ascii_lowercase +
                                     string.digits) for _ in range(lenght))
        while code[:1] == '0':
            code = ''.join(random.choice(string.ascii_lowercase +
                                         string.digits) for _ in range(lenght))

    else:
        code = ''.join(random.choice(string.ascii_uppercase +
                                     string.digits) for _ in range(lenght))
        while code[:1] == '0':
            code = ''.join(random.choice(string.ascii_uppercase +
                                         string.digits) for _ in range(lenght))
    return "%s" % (code)


def get_day_of_week_vi(date):
    if date.weekday() == 0:
        return 'Thứ 2'
    elif date.weekday() == 1:
        return 'Thứ 3'
    elif date.weekday() == 2:
        return 'Thứ 4'
    elif date.weekday() == 3:
        return 'Thứ 5'
    elif date.weekday() == 4:
        return 'Thứ 6'
    elif date.weekday() == 5:
        return 'Thứ 7'
    elif date.weekday() == 6:
        return 'CN'


def get_day_of_week_en(date):
    if date.weekday() == 0:
        return 'Mon'
    elif date.weekday() == 1:
        return 'Tue'
    elif date.weekday() == 2:
        return 'Web'
    elif date.weekday() == 3:
        return 'Thu'
    elif date.weekday() == 4:
        return 'Fri'
    elif date.weekday() == 5:
        return 'Set'
    elif date.weekday() == 6:
        return 'Sun'


# handle argument in text message
def handle_argument(text, source):
    if source is None:
        source = {}

    if source.get('gender') is None or source.get('gender') == '' or source.get('gender').strip() == '':
        source['gender'] = 'Anh/Chị'
    else:
        source['gender'] = validate_gender(source.get('gender'))

    result = text
    if (text and text.find("{{") >= 0 and text.find("}}") >= 0):
        try:
            template = Environment(
                loader=BaseLoader(),
                undefined=Undefined
            ).from_string(text)

            result = template.render(**source)
        except:
            print("handle_argument exception", text)

    return result



def hash_string(string):
    """
    Return a SHA-256 hash of the given string
    """
    return hashlib.sha256(string.encode('utf-8')).hexdigest()


def convert_unsigned_vietnamese(s):
    s = re.sub(r'[àáạảãâầấậẩẫăằắặẳẵ]', 'a', s)
    s = re.sub(r'[ÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪ]', 'A', s)
    s = re.sub(r'[èéẹẻẽêềếệểễ]', 'e', s)
    s = re.sub(r'[ÈÉẸẺẼÊỀẾỆỂỄ]', 'E', s)
    s = re.sub(r'[òóọỏõôồốộổỗơờớợởỡ]', 'o', s)
    s = re.sub(r'[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]', 'O', s)
    s = re.sub(r'[ìíịỉĩ]', 'i', s)
    s = re.sub(r'[ÌÍỊỈĨ]', 'I', s)
    s = re.sub(r'[ùúụủũưừứựửữ]', 'u', s)
    s = re.sub(r'[ƯỪỨỰỬỮÙÚỤỦŨ]', 'U', s)
    s = re.sub(r'[ỳýỵỷỹ]', 'y', s)
    s = re.sub(r'[ỲÝỴỶỸ]', 'Y', s)
    s = re.sub(r'[Đ]', 'D', s)
    s = re.sub(r'[đ]', 'd', s)
    return s
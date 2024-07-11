tenant_headers = [
    {'key': 'gochanoi',
     'value': {
         'Content-Type': 'application/json',
         'X-UPCRM-APPKEY': '7418102336166499',
         'X-UPCRM-SECRETKEY': 'VSGMH1H1IY6TOSC38NGMTZ5AG5X5G7ZMRLD3EH5G8BYWCFHZ7SRAYC29VSQHXXNZ'
     }},
    {'key': 'trelangquan',
     'value': {
         'Content-Type': 'application/json',
         'X-UPCRM-APPKEY': '0040611729072159',
         'X-UPCRM-SECRETKEY': '9Z95ZM3LCNH4SJ3IPOEE4JMKIPVRJPL79FU5EB53RXRC8W5S45FP7SG4NXD9CPDI'
     }},
    {'key': 'kieuhoaquan',
     'value': {
         'Content-Type': 'application/json',
         'X-UPCRM-APPKEY': '8190783093612992',
         'X-UPCRM-SECRETKEY': 'U6VYOX6BDLEX218349421FQEA1CWXJPA8IEQJ8QVSMPF9S1CI1SCY3CZFNAOJRJN'
     }}
]

FB_HUB_VERIFY_TOKEN = 'upgo-token-dy4flekm7qpva0lah99js92oklj53prn'

status = {
    'active': 'active',
    'deactive': 'deactive',
    'delete': 'delete',
    'show': 'show',
    'hide': 'hide'
}

promotion_status = {
    'active': 'active',
    'used': 'used',
    'canceled': 'canceled',
    'notified': 'notified',
    'locked': 'locked'
}


message = {
    'success': 'Success',
    'failed': 'Failed',
    'error': 'Error'
}

MSG_CODE = {
    'SUCCESS': 'SUCCESS'
}

MSG = {
    'SUCCESS': 'Success'
}


ERROR_CODE = {
    'SERVER_ERROR': 'SERVER_ERROR',
    'AUTH_ERROR': 'AUTH_ERROR',
    'PERMISSION_ERROR': 'PERMISSION_ERROR',
    'NOT_FOUND': 'NOT_FOUND',
    'EXIST_ERROR': 'EXIST_ERROR',
    'NULL_ERROR': 'NULL_ERROR',
    'ARGS_ERROR': 'ARGS_ERROR',
    'DATA_FORMAT': 'DATA_FORMAT',
    'SUBSCRIBED_ERROR': 'SUBSCRIBED_ERROR'
}

ERROR_MSG = {
    'SERVER_ERROR': 'Server error',
    'PERMISSION_ERROR': 'Permission denied',
    'AUTH_ERROR': 'Authentication is failed',
    'EXIST_ERROR': 'Record already exists',
    'NOT_FOUND': 'Not Found',
    'NULL_ERROR': 'Some fields are not allow to be empty',
    'ARGS_ERROR': 'Get arguments error',
    'DATA_FORMAT': 'Data format is not correct',
    'SUBSCRIBED_ERROR': 'Subscribe Page Error'
}

STATUS_CODE = {
    'OK': 200,
    'ERROR': 520,
    'ARGS_ERROR': 521,
    'AUTH_ERROR': 523,
    'NOT_FOUND': 524,
    'SUBSCRIBED_ERROR': 525
}

DEFAULT_PERSISTENT_MENU = [
    {
        "locale": "default",
        "composer_input_disabled": False,
        "call_to_actions": [
            {
                "type": "web_url",
                "url": "https://www.upgo.vn",
                "title": "⚡ by UPGO.vn",
                "webview_height_ratio": "full"
            }
        ]
    }
]


WIT_APPS = [
    {'id': 293150315416909, 'name': 'ai.restaurant', 'access_token': 'PI7RXAZAMEHFVPNIVR5OGXSFTEVTXEJ3', 'business_line': 'restaurant'},
    {'id': 553535895548712, 'name': 'ai.cafe', 'access_token': 'NE66LL3WAUNLWII47XLBY7E32GIDJ7F2', 'business_line': 'cafe'},
    {'id': 2629650920645096, 'name': 'ai.spa', 'access_token': 'SRJMOUWTG45LGAUIURHFMV2XODNJSKYO', 'business_line': 'spa'},
    {'id': 562598594401523, 'name': 'ai.clothes_shop', 'access_token': '7HAQ574OG7SML5HFABQKICOVCKBDNOMU', 'business_line': 'clothes_shop'},
    {'id': 316798473002566, 'name': 'ai.furniture', 'access_token': 'HYDWYJSWPZMPPNA4T3TWMI2RN4YO3AXL', 'business_line': 'furniture'},
    {'id': 1053570188410159, 'name': 'ai.homeware', 'access_token': '6LPM24NGCMWQFG3KPN2LBCDBKFIZGVVM', 'business_line': 'homeware'},
    {'id': 611074582875704, 'name': 'ai.education_center', 'access_token': 'DRDKPYIUWWCTWAAYDIX37P3AMQF5H2GM', 'business_line': 'education_center'},
    {'id': 615101412761215, 'name': 'ai.software', 'access_token': 'IIAMOW53LR3ERTS6ICT3SQ6DN3QPST3E', 'business_line': 'software'},
    {'id': 3425650940833285, 'name': 'ai.market', 'access_token': 'M3IO5ZRWTJYZNCWAESL6S3QQXYHJE6A4', 'business_line': 'market'}
]
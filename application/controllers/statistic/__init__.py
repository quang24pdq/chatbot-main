from datetime import datetime
from decimal import Decimal
from gatco.response import json, text, html
from application.server import app
from application.database import motordb
from application.common.helpers import now_timestamp, get_datetime_timezone
from application.controllers.tenant import get_current_tenant_id


@app.route('api/v1/statistic/total_user_time_line', methods=['GET'])
async def total_user_time_line(request):
    bot_id = request.args.get('bot_id', None)
    from_time = int(request.args.get('from', None))
    to_time = int(request.args.get('to', None))
    now = now_timestamp()

    results = []

    for i in range(0, 15):
        timestamp = to_time - ((30 - (i * 2)) * 86400000)
        end_day = timestamp + 86400000
        now = get_datetime_timezone(timestamp)

        # print (now.day)
        # print (timestamp, ' - ', end_day)
        contact_count = await motordb.db['contact'].count_documents({'$and': [
                                                                        {'bot_id': bot_id},\
                                                                        {'interacted': True},\
                                                                        {'created_at': {'$lte': end_day}}
                                                                    ]})
        results.append({
            'date': datetime.strftime(now, '%b %d').upper(),
            'total': contact_count
        })

    return json(results)

from datetime import datetime
from gatco.response import json
from application.extensions import apimanager
from application.database import motordb
from application.controllers.base import auth_func
from application.controllers.facebook.base import pre_post_set_position, pre_get_many_order_by
from application.controllers.tenant import set_tenant


async def pre_process_delete_group(request=None, instance_id=None, **kw):
    if instance_id is not None:
        blocks = motordb.db['block'].find({'group_id': instance_id})

        async for block in blocks:
            await motordb.db['card'].delete_many({'block_id': str(block['_id'])})
    
        await motordb.db['block'].delete_many({'group_id': instance_id})


async def post_process_get_group(request=None, instance_id=None, result=None, **kw):
    if result.get('objects') is not None and isinstance(result['objects'], list):
        for index, val in enumerate(result['objects']):

            if isinstance(val.get('created_at'), datetime):
                del result['objects'][index]['created_at']

            if isinstance(val.get('updated_at'), datetime):
                del result['objects'][index]['updated_at']
    
    elif result.get('_id') is not None:
        if isinstance(result.get('created_at'), datetime):
            del result['created_at']

        if isinstance(result.get('updated_at'), datetime):
            del result['updated_at']


apimanager.create_api(collection_name='group',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func, pre_get_many_order_by],
        POST=[auth_func, pre_post_set_position, set_tenant],
        PUT_SINGLE=[auth_func],
        DELETE_SINGLE=[pre_process_delete_group]
    ),
    postprocess=dict(
        POST=[],
        GET_SINGLE=[post_process_get_group],
        GET_MANY=[post_process_get_group]
    )
)

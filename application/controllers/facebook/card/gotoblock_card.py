from application.controllers.facebook.block import handle_condition, handle_block
from application.controllers.facebook.contact.current_input import update_current_input_blocks, cancel_current_input,\
    check_block_loop, reset_block_loop_counter
from bson.objectid import ObjectId
from application.database import motordb
from copy import deepcopy


async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    result_condition = True
    if card is not None and isinstance(card.get("conditions"), list) and len(card.get("conditions")) > 0:
        conditions = card.get("conditions")
        rule_condition = card.get("rule_condition") if card.get("rule_condition", None) is not None else "and"  # and / or
        # print ('rule_condition ', rule_condition)
        result_condition = handle_condition(contact, conditions, rule_condition)
        # print ('result_condition ', result_condition)

    if result_condition == True:
        blocks = card.get("blocks")
        block_ids = [block.get("_id") for block in blocks]

        if len(block_ids) > 0:
            contact = await update_current_input_blocks(contact, block_ids)
            contact = await reset_block_loop_counter(contact, block_id)

            await handle_block(bot, contact, {"block_id": block_ids[0], "type": "block"})
            # GO TO NEW BLOCK
            # CANCEL CURRENT FLOW FOR NEXT CARD
            return deepcopy(contact)

    return None

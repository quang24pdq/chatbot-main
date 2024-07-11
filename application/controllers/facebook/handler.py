# import importlib
# # from application.server import app
# from application.database import motordb


# async def handle_block(bot, contact, block_id, position=0):
#     print ("HANDLE BLOCK")
#     # FIND NEXT CARD TO HANDLE
#     cards = motordb.db['card'].find({'block_id': block_id, 'position': {'$gt': position}}, sort=[('position', 1)])
#     cards = await cards.to_list(length=100)
#     if isinstance(cards, list) is True and len(cards) > 0:
#         for index, card in enumerate(cards):
#         # for card in cards:

#             card_handler_name = "application.controllers.facebook.card." + card.get("type") + "_card"
#             card_handler = None

#             print ("============ card_handler_name ============ ", card_handler_name)
#             card_handler = importlib.import_module(card_handler_name)

#             if card_handler is not None:
#                 to_be_continue = await card_handler.card_handler(card, bot, contact, block_id)
#                 print ("handle_block to_be_continue ", to_be_continue)

#                 if to_be_continue is False:
#                     await reset_block_loop_counter(contact, block_id)
#                     return

#     # check next block:
#     elif (len(contact['_current_input'].get('current_blocks', [])) > 0):
#         handle_block_id = contact['_current_input']['current_blocks'].pop(0)
#         await update_current_input_blocks(contact, contact['_current_input']['current_blocks'])
#         if handle_block_id is not None:
#             await handle_block(bot, contact, {"block_id": handle_block_id, "type": "block"})
# #             else:
# #                 contact['_current_input']["payload_start_block"] = None
# #                 await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

#     await reset_block_loop_counter(contact, block_id)
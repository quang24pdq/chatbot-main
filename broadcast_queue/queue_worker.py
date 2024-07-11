import redis
import time
from application.config import Config
from .redis_queue import SimpleQueue


def worker():
    #r = redis.Redis()
    r = redis.StrictRedis.from_url(Config.QUEUE_REDIS_URI)
    queue = SimpleQueue(r, 'chatbot-broadcast')

    while True:
        print("Broadcast Queue Length: ", queue.get_length())
        if queue.get_length() > 0:
            queue.dequeue()
        else:
            time.sleep(Config.WORKER_TIME_SLEEP)


def conversation_worker():
    #r = redis.Redis()
    r = redis.StrictRedis.from_url(Config.QUEUE_REDIS_URI)
    queue = SimpleQueue(r, 'chatbot-conversation')

    while True:
        print("Conversation Queue Length: ", queue.get_length())
        if queue.get_length() > 0:
            queue.dequeue()
        else:
            time.sleep(Config.WORKER_TIME_SLEEP)


if __name__ == '__main__':
    worker()

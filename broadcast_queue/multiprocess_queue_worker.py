import os
import logging
import multiprocessing

#from tasks import add
from .queue_worker import worker, conversation_worker

PROCESSES = 4


def run():
    processes = []
    print(f'Running with {PROCESSES} processes!')
    for w in range(PROCESSES):
        p = multiprocessing.Process(target=worker)
        processes.append(p)
        p.start()
    # for p in processes:
    #     p.join()

    for w in range(PROCESSES):
        p = multiprocessing.Process(target=conversation_worker)
        processes.append(p)
        p.start()

    for p in processes:
        p.join()


if __name__ == '__main__':
    run()

from tkinter import ttk, messagebox
from gen.counter_frame import CounterFrameBase

class CounterFrame(CounterFrameBase):
    counter = 0

    def _increment(self):
        self.counter += 1
        self._update()

    def _decrement(self):
        self.counter -= 1
        self._update()

    def _reset(self):
        self.counter = 0
        self._update()

    def _update(self):
        self._label.config(text=f"Counter: {self.counter}")
from tkinter import ttk, messagebox
from gen.top_frame import TopFrameBase

class TopFrame(TopFrameBase):
    def _say_hello(self):
        name = self.name_entry.get().strip()

        if not name:
            messagebox.showwarning("Missing Name", "Please type your name.")
            return

        messagebox.showinfo("Greeting", f"Hello, {name}!")
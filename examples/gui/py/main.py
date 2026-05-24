import tkinter as tk
from top_frame import TopFrame
from counter_frame import CounterFrame

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Tkinter Example")
        self.root.geometry("500x400")

        TopFrame(root).pack(fill="x")
        CounterFrame(root).pack(fill="x", padx=10, pady=10)

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()

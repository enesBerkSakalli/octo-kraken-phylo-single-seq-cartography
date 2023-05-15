from flask import Flask
from flask import request, abort, render_template

app = Flask(__name__)

@app.route('/')
def index():
    if request.method == "GET":
        return render_template('form.html')
    else:
        return render_template('index.html','')
    
if __name__ == "__main__":
    app.run(debug=True)
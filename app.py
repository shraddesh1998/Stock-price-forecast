# app.py
from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import yfinance as yf
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from sklearn.ensemble import RandomForestRegressor
from datetime import timedelta
import warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)

@app.route('/')
def home():
    return render_template("index.html")

@app.route('/predict')
def predict():
    ticker = request.args.get('ticker', default='TCS.NS')
    days = int(request.args.get('days', 10))
    model = request.args.get('model', 'all').lower()

    # Download historical data
    df = yf.download(ticker, start="2015-01-01")[['Close']].dropna()
    df.rename(columns={"Close": "y"}, inplace=True)

    # Create future dates
    future_dates = pd.date_range(start=df.index[-1] + timedelta(days=1), periods=days, freq='B')

    results = {'Date': future_dates.strftime('%Y-%m-%d').tolist()}

    if model in ('sma', 'all'):
        sma_val = df['y'].rolling(10).mean().iloc[-1]
        results['SMA'] = [float(sma_val)] * days

    if model in ('ema', 'all'):
        ema_val = df['y'].ewm(span=10, adjust=False).mean().iloc[-1]
        results['EMA'] = [float(ema_val)] * days

    if model in ('naive', 'all'):
        naive_val = df['y'].iloc[-1]
        results['Naive'] = [float(naive_val)] * days

    if model in ('ets', 'all'):
        ets_model = ExponentialSmoothing(df['y'], trend='add', seasonal='add', seasonal_periods=5)
        ets_fit = ets_model.fit()
        results['ETS'] = ets_fit.forecast(days).tolist()

    if model in ('arima', 'all'):
        arima_model = ARIMA(df['y'], order=(5, 1, 0))
        arima_fit = arima_model.fit()
        results['ARIMA'] = arima_fit.forecast(steps=days).tolist()

    if model in ('randomforest', 'all'):
        rf_df = df.copy()
        rf_df['lag1'] = rf_df['y'].shift(1)
        rf_df['lag2'] = rf_df['y'].shift(2)
        rf_df.dropna(inplace=True)
        X_rf = rf_df[['lag1', 'lag2']]
        y_rf = rf_df['y']
        model_rf = RandomForestRegressor(random_state=42)
        model_rf.fit(X_rf, y_rf)

        last_lag1 = rf_df['lag1'].iloc[-1]
        last_lag2 = rf_df['lag2'].iloc[-1]
        rf_preds = []
        for _ in range(days):
            pred = model_rf.predict([[last_lag1, last_lag2]])[0]
            rf_preds.append(float(pred))
            last_lag2 = last_lag1
            last_lag1 = pred

        results['RandomForest'] = rf_preds

    return jsonify(pd.DataFrame(results).to_dict(orient="records"))

if __name__ == '__main__':
    app.run(debug=True)

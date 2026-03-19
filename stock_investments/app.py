import streamlit as st
import requests
import pandas as pd
from datetime import datetime, timedelta
import time

# Configuration
API_KEY = "IVCROGUOH0S4GJVS"  # Get free key from https://www.alphavantage.co/support/#api-key
BASE_URL = "https://www.alphavantage.co/query"

# Helper function to get the last trading day
def get_last_trading_day(date):
    """Return the last trading day (skip weekends)"""
    while date.weekday() >= 5:  # 5=Saturday, 6=Sunday
        date -= timedelta(days=1)
    return date

# Helper function to get the next trading day
def get_next_trading_day(date):
    """Return the next trading day (skip weekends)"""
    date += timedelta(days=1)
    while date.weekday() >= 5:
        date += timedelta(days=1)
    return date

# Function to get top gainers
def fetch_top_gainers():
    """Fetch top gainers using Alpha Vantage TOP_GAINERS_LOSERS endpoint"""
    try:
        params = {
            'function': 'TOP_GAINERS_LOSERS',
            'apikey': API_KEY
        }
        
        response = requests.get(BASE_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        # Check for API errors
        if 'Error Message' in data:
            st.error(f"API Error: {data['Error Message']}")
            return pd.DataFrame()
        
        if 'Note' in data:
            st.warning(f"API Limit: {data['Note']}")
            return pd.DataFrame()
        
        # Extract gainers
        if 'top_gainers' not in data:
            st.warning("No gainers data available")
            return pd.DataFrame()
        
        gainers = data['top_gainers']
        
        # Convert to DataFrame
        df = pd.DataFrame(gainers)
        
        if not df.empty:
            # Select and rename columns
            df = df[['ticker', 'price', 'change_percentage']].copy()
            df.columns = ['Symbol', 'Price', 'Change %']
            
            # Clean up the change percentage (remove % sign)
            df['Change %'] = df['Change %'].str.rstrip('%').astype(float)
            df['Price'] = df['Price'].astype(float).round(2)
            
            # Filter: Minimum price of $3 and minimum change of 50%
            df = df[(df['Price'] >= 3.0) & (df['Change %'] >= 50.0)]
            
            # Get company names using OVERVIEW endpoint (limited due to API rate)
            # For free tier, we'll skip names to save API calls
            df.insert(1, 'Name', df['Symbol'])  # Use symbol as name for now
            
            # Sort by change percentage
            df = df.sort_values('Change %', ascending=False).head(20)
        
        return df
        
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching gainers: {e}")
        return pd.DataFrame()
    except Exception as e:
        st.error(f"Unexpected error: {e}")
        return pd.DataFrame()

# Function to check if stock has news
def has_news_on_date(symbol, date_str):
    """Check if a stock has news on a specific date using Alpha Vantage NEWS_SENTIMENT"""
    try:
        # Convert date to timestamp format for API
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
        time_from = target_date.strftime("%Y%m%dT0000")
        time_to = target_date.strftime("%Y%m%dT2359")
        
        params = {
            'function': 'NEWS_SENTIMENT',
            'tickers': symbol,
            'time_from': time_from,
            'time_to': time_to,
            'limit': 50,
            'apikey': API_KEY
        }
        
        response = requests.get(BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Check for errors
        if 'Error Message' in data or 'Note' in data:
            return False
        
        # Check if there are any news items
        if 'feed' in data and len(data['feed']) > 0:
            return True
        
        return False
        
    except:
        return False

# Function to filter gainers without news
def filter_gainers_without_news(gainers_df, date_str, max_stocks=10):
    """Filter gainers to exclude those with news on the date"""
    if gainers_df.empty:
        return gainers_df
    
    # Limit to avoid API rate limits (5 calls/minute for free tier)
    gainers_df_limited = gainers_df.head(max_stocks)
    
    st.info(f"Checking top {len(gainers_df_limited)} gainers for news... This will take about {len(gainers_df_limited) * 12} seconds due to API rate limits.")
    progress_bar = st.progress(0)
    
    filtered_symbols = []
    total = len(gainers_df_limited)
    
    # Use enumerate for proper indexing
    for position, (idx, row) in enumerate(gainers_df_limited.iterrows()):
        symbol = row['Symbol']
        
        # Check for news
        has_news = has_news_on_date(symbol, date_str)
        
        if not has_news:
            filtered_symbols.append(symbol)
        
        # Update progress using position (0-based, so add 1)
        progress_bar.progress((position + 1) / total)
        
        # Rate limiting: Free tier allows 5 calls/minute
        # Wait 12 seconds between calls to stay under limit
        if position < total - 1:  # Don't wait after the last call
            time.sleep(12)
    
    progress_bar.empty()
    
    # Filter dataframe
    result = gainers_df[gainers_df['Symbol'].isin(filtered_symbols)]
    return result

# Function to get earnings calendar
def fetch_earnings_calendar(date_str):
    """Fetch earnings calendar using Alpha Vantage EARNINGS_CALENDAR"""
    try:
        # Alpha Vantage uses horizon parameter (3month, 6month, 12month)
        # We'll get 3month and filter for our specific date
        params = {
            'function': 'EARNINGS_CALENDAR',
            'horizon': '3month',
            'apikey': API_KEY
        }
        
        response = requests.get(BASE_URL, params=params, timeout=15)
        response.raise_for_status()
        
        # The response is CSV format
        from io import StringIO
        
        # Check if response is JSON (error message)
        try:
            json_data = response.json()
            if 'Error Message' in json_data:
                st.error(f"API Error: {json_data['Error Message']}")
                return pd.DataFrame()
            if 'Note' in json_data:
                st.warning(f"API Limit: {json_data['Note']}")
                return pd.DataFrame()
        except:
            pass  # Not JSON, continue with CSV parsing
        
        # Parse CSV
        df = pd.read_csv(StringIO(response.text))
        
        if df.empty:
            return pd.DataFrame()
        
        # Filter for the specific date
        df['reportDate'] = pd.to_datetime(df['reportDate']).dt.date
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        df = df[df['reportDate'] == target_date]
        
        return df
        
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching earnings calendar: {e}")
        return pd.DataFrame()
    except Exception as e:
        st.error(f"Unexpected error: {e}")
        return pd.DataFrame()

# Function to get earnings history
def get_earnings_history(symbol):
    """Get earnings history to check beat rate using EARNINGS endpoint"""
    try:
        params = {
            'function': 'EARNINGS',
            'symbol': symbol,
            'apikey': API_KEY
        }
        
        response = requests.get(BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Check for errors
        if 'Error Message' in data or 'Note' in data:
            return None
        
        if 'quarterlyEarnings' not in data:
            return None
        
        quarterly = data['quarterlyEarnings']
        
        if len(quarterly) < 4:
            return None
        
        # Check last 4 quarters for beats
        beats = 0
        for i in range(4):
            reported = quarterly[i].get('reportedEPS')
            estimated = quarterly[i].get('estimatedEPS')
            
            if reported and estimated:
                try:
                    if float(reported) > float(estimated):
                        beats += 1
                except:
                    continue
        
        return beats >= 3
        
    except:
        return None

# Function to filter earnings by beat history
def filter_earnings_by_beat_history(earnings_df, max_stocks=5):
    """Filter earnings to include only stocks that beat estimates 3+ times in last 4 quarters"""
    if earnings_df.empty:
        return earnings_df
    
    # Limit to avoid API rate limits
    earnings_df_limited = earnings_df.head(max_stocks)
    
    st.info(f"Checking earnings history for {len(earnings_df_limited)} stocks... This will take about {len(earnings_df_limited) * 12} seconds due to API rate limits.")
    progress_bar = st.progress(0)
    
    filtered_data = []
    total = len(earnings_df_limited)
    
    # Use enumerate for proper indexing
    for position, (idx, row) in enumerate(earnings_df_limited.iterrows()):
        symbol = row['symbol']
        
        # Check beat history
        beat_history = get_earnings_history(symbol)
        
        if beat_history:
            filtered_data.append({
                'Symbol': symbol,
                'Estimated EPS': row.get('estimate', 'N/A'),
                'Fiscal Date': row.get('fiscalDateEnding', 'N/A'),
                'Report Date': row.get('reportDate', 'N/A')
            })
        
        # Update progress using position (0-based, so add 1)
        progress_bar.progress((position + 1) / total)
        
        # Rate limiting: Wait 12 seconds between calls
        if position < total - 1:
            time.sleep(12)
    
    progress_bar.empty()
    
    # Create result dataframe
    result = pd.DataFrame(filtered_data)
    
    return result

# Streamlit App
def main():
    st.set_page_config(page_title="Stock Analyzer", page_icon="📈", layout="wide")
    
    st.title("📈 Stock Market Analyzer")
    st.markdown("---")
    
    # Check if API key is set
    if not API_KEY or API_KEY.strip() == "YOUR_API_KEY_HERE":
        st.error("⚠️ Please set your Alpha Vantage API key in the code.")
        st.info("Get a **FREE** API key from https://www.alphavantage.co/support/#api-key")
        st.info("✅ No credit card required | ✅ 25 requests per day free tier")
        st.stop()
    
    # API usage warning
    st.warning("⏱️ **Rate Limit Notice**: Alpha Vantage free tier allows 5 API calls per minute and 25 per day. This app checks a limited number of stocks and waits 12 seconds between calls.")
    
    # Get current date and calculate relevant dates
    today = datetime.now().date()
    
    # For gainers: use last trading day
    last_trading_day = get_last_trading_day(today)
    gainers_date_str = last_trading_day.strftime("%Y-%m-%d")
    
    # For earnings: use next trading day
    next_trading_day = get_next_trading_day(today)
    earnings_date_str = next_trading_day.strftime("%Y-%m-%d")
    
    # Section 1: Top Gainers Without News
    st.header(f"🚀 Top Gainers Without Any News")
    st.subheader(f"Date: {last_trading_day.strftime('%A, %B %d, %Y')}")
    st.caption("📊 Filtered: Minimum price $3.00 | Minimum gain 50%")
    
    with st.spinner("Fetching top gainers from Alpha Vantage..."):
        gainers_df = fetch_top_gainers()
    
    if not gainers_df.empty:
        st.success(f"✅ Found {len(gainers_df)} gainers")
        
        # Show all gainers first
        with st.expander("📊 View All Top Gainers (Before Filtering)", expanded=False):
            st.dataframe(gainers_df, use_container_width=True, hide_index=True)
        
        # Filter out stocks with news (checking top 10 to save API calls)
        filtered_gainers = filter_gainers_without_news(gainers_df, gainers_date_str, max_stocks=10)
        
        if not filtered_gainers.empty:
            st.success(f"✅ Found {len(filtered_gainers)} gainers without news")
            st.dataframe(
                filtered_gainers,
                use_container_width=True,
                hide_index=True
            )
        else:
            st.warning("No gainers found without news in the top 10 stocks checked.")
    else:
        st.warning("Unable to fetch gainers data. Check the error messages above.")
    
    st.markdown("---")
    
    # Section 2: Stocks with Earnings Tomorrow
    st.header(f"📊 Stocks with Earnings Tomorrow Projected to Beat Estimates")
    st.subheader(f"Earnings Date: {next_trading_day.strftime('%A, %B %d, %Y')}")
    st.caption("Filtered: Beat estimates in at least 3 of last 4 quarters")
    
    with st.spinner("Fetching earnings calendar from Alpha Vantage..."):
        earnings_df = fetch_earnings_calendar(earnings_date_str)
    
    if not earnings_df.empty:
        st.success(f"✅ Found {len(earnings_df)} stocks with earnings scheduled")
        
        # Show all earnings first
        with st.expander("📊 View All Scheduled Earnings (Before Filtering)", expanded=False):
            st.dataframe(earnings_df.head(20), use_container_width=True, hide_index=True)
        
        # Filter by beat history (checking top 5 to save API calls)
        filtered_earnings = filter_earnings_by_beat_history(earnings_df, max_stocks=5)
        
        if not filtered_earnings.empty:
            st.success(f"✅ Found {len(filtered_earnings)} stocks with strong earnings history")
            st.dataframe(
                filtered_earnings,
                use_container_width=True,
                hide_index=True
            )
        else:
            st.warning("No stocks found that meet the earnings beat criteria in the top 5 stocks checked.")
    else:
        st.warning("No earnings scheduled for tomorrow or unable to fetch data.")
    
    # Footer
    st.markdown("---")
    st.caption(f"📡 Data provided by Alpha Vantage API | Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    st.caption("⚠️ Free tier limitations: 5 API calls/minute, 25 calls/day. Limited to 10 gainers and 5 earnings stocks to conserve API quota.")

if __name__ == "__main__":
    main()
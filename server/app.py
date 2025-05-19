from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize OpenAI client
openai.api_key = os.getenv('OPENAI_API_KEY')

# Store conversation history (in a real app, use a database)
conversation_history = {}

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_id = data.get('user_id', 'default')
        message = data.get('message')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400

        # Initialize or get conversation history for user
        if user_id not in conversation_history:
            conversation_history[user_id] = []

        # Add user message to history
        conversation_history[user_id].append({
            'role': 'user',
            'content': message
        })

        # Get AI response
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a helpful shopping assistant that helps users create personalized grocery shopping carts. Ask relevant questions about their preferences, dietary restrictions, and shopping needs. Keep responses concise and focused on grocery shopping.'
                },
                *conversation_history[user_id]
            ],
            temperature=0.7,
            max_tokens=150
        )

        # Extract AI response
        ai_response = response.choices[0].message.content

        # Add AI response to history
        conversation_history[user_id].append({
            'role': 'assistant',
            'content': ai_response
        })

        # Keep conversation history manageable (last 10 messages)
        if len(conversation_history[user_id]) > 10:
            conversation_history[user_id] = conversation_history[user_id][-10:]

        return jsonify({
            'success': True,
            'message': ai_response
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 
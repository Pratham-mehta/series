import json
import boto3

# Initialize the Bedrock Runtime Client
bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    try:
        # 1. Parse Incoming Data
        # We expect the event to come from your local Bridge Script
        incoming_text = event.get('message', '')
        
        if not incoming_text:
            return {'statusCode': 400, 'body': 'No message provided'}

        print(f"Analyzing message: {incoming_text}")

        # 2. Define the Prompt (The "Empathy" Logic)
        # We ask Claude to return strictly JSON so our code can parse it easily.
        system_prompt = """
        You are an AI communication coach designed to make digital conversations more human.
        Analyze the input message.
        
        Rules:
        1. DETECT: Identify the sentiment (Angry, Passive-Aggressive, Sad, Neutral, Happy).
        2. ACTION: 
           - If Negative/Aggressive: Rewrite it to be kinder but keep the meaning.
           - If Neutral/Positive: Suggest a "Vibe" (e.g., "Celebratory", "Chill").
        3. FORMAT: Return ONLY a JSON object. No markdown, no text before/after.
        
        Example JSON format:
        {
            "sentiment": "Angry",
            "rewrite_needed": true,
            "suggestion": "I'm feeling a bit frustrated with the delay. Can we fix it?",
            "vibe_color": "Red"
        }
        """

        user_message = f"Message to analyze: \"{incoming_text}\""

        # 3. Payload for Claude 3.5 Haiku
        # Note: 3.5 Haiku uses the Messages API format
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 300,
            "messages": [
                {
                    "role": "user", 
                    "content": [
                        {"type": "text", "text": system_prompt + "\n" + user_message}
                    ]
                }
            ]
        })

        # 4. Invoke Model
        # Use 'us.anthropic.claude-3-5-haiku-20241022-v1:0' for US regions (Inference Profile)
        # If that fails, try the base ID: 'anthropic.claude-3-5-haiku-20241022-v1:0'
        model_id = 'us.anthropic.claude-3-5-haiku-20241022-v1:0'
        
        response = bedrock.invoke_model(
            modelId=model_id,
            body=body
        )

        # 5. Process Response
        response_body = json.loads(response.get('body').read())
        ai_text = response_body['content'][0]['text']
        
        print(f"AI Raw Output: {ai_text}")

        # Return the AI's analysis to your Bridge Script
        return {
            'statusCode': 200,
            'body': ai_text
        }

    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }
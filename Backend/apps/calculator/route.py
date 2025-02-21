from fastapi import APIRouter, HTTPException
import base64
from io import BytesIO
from apps.calculator.utils import analyze_image
from schema import ImageData
from PIL import Image

router = APIRouter()

@router.post("")
async def run(data: ImageData):
    base64_str = data.image

    # Handle both "data:image/png;base64,<data>" and raw Base64 cases
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]

    try:
        image_data = base64.b64decode(base64_str)
        image_bytes = BytesIO(image_data)
        image = Image.open(image_bytes)
    except Exception as e:
        print("Error decoding image:", str(e))
        raise HTTPException(status_code=400, detail="Invalid Base64 image data")

    try:
        responses = analyze_image(image, dict_of_vars=data.dict_of_vars)
    except Exception as e:
        print("Error analyzing image:", str(e))
        raise HTTPException(status_code=500, detail="Error processing image")

    data_list = []
    response = None  # Ensure response is always defined
    for response in responses:
        data_list.append(response)

    print('response in route:', response)
    return {"message": "Image processed", "data": data_list, "status": "success"}

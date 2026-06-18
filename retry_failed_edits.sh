#!/bin/bash
MODEL="gemini-2.5-flash-image"

# Sunglasses Batch
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/sahara_dress.png -m $MODEL -o public/images/sahara_dress
sleep 15
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/medina_skirt.png -m $MODEL -o public/images/medina_skirt
sleep 15
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/petra_undercap.png -m $MODEL -o public/images/petra_undercap
sleep 15

# Niqabs Batch
nano-banana "edit the image to add a stylish niqab covering the lower half of the face. The niqab MUST perfectly match the color and fabric of her current outfit. Ensure the woman's head is completely covered by her hijab with absolutely no hair visible. Keep the rest of the image identical" -r public/images/heritage_tunic.png -m $MODEL -o public/images/heritage_tunic
sleep 15
nano-banana "edit the image to add a stylish niqab covering the lower half of the face. The niqab MUST perfectly match the color and fabric of her current outfit. Ensure the woman's head is completely covered by her hijab with absolutely no hair visible. Keep the rest of the image identical" -r public/images/lumina_hijab.png -m $MODEL -o public/images/lumina_hijab
sleep 15
nano-banana "edit the image to add a stylish niqab covering the lower half of the face. The niqab MUST perfectly match the color and fabric of her current outfit. Ensure the woman's head is completely covered by her hijab with absolutely no hair visible. Keep the rest of the image identical" -r public/images/atlas_kimono.png -m $MODEL -o public/images/atlas_kimono

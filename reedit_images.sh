#!/bin/bash
MODEL="gemini-2.5-flash-image"

# Sunglasses Batch
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/oasis_abaya.png -m $MODEL -o public/images/oasis_abaya &
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/sahara_dress.png -m $MODEL -o public/images/sahara_dress &
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/medina_skirt.png -m $MODEL -o public/images/medina_skirt &
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/dune_trousers.png -m $MODEL -o public/images/dune_trousers &
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/serene_knit.png -m $MODEL -o public/images/serene_knit &
wait

# Niqabs Batch
nano-banana "edit the image to add a stylish niqab covering the lower half of the face. The niqab MUST perfectly match the color and fabric of her current outfit. Ensure the woman's head is completely covered by her hijab with absolutely no hair visible. Keep the rest of the image identical" -r public/images/nomad_hijab.png -m $MODEL -o public/images/nomad_hijab &
nano-banana "edit the image to add a stylish niqab covering the lower half of the face. The niqab MUST perfectly match the color and fabric of her current outfit. Ensure the woman's head is completely covered by her hijab with absolutely no hair visible. Keep the rest of the image identical" -r public/images/atlas_kimono.png -m $MODEL -o public/images/atlas_kimono &
nano-banana "edit the image to add a stylish niqab covering the lower half of the face. The niqab MUST perfectly match the color and fabric of her current outfit. Ensure the woman's head is completely covered by her hijab with absolutely no hair visible. Keep the rest of the image identical" -r public/images/lumina_hijab.png -m $MODEL -o public/images/lumina_hijab &
nano-banana "edit the image to add a stylish niqab covering the lower half of the face. The niqab MUST perfectly match the color and fabric of her current outfit. Ensure the woman's head is completely covered by her hijab with absolutely no hair visible. Keep the rest of the image identical" -r public/images/heritage_tunic.png -m $MODEL -o public/images/heritage_tunic &
nano-banana "edit the image to add stylish black sunglasses covering the eyes. Ensure the woman's head is completely covered by her hijab or headwear with absolutely no hair visible. Keep the rest of the image identical" -r public/images/petra_undercap.png -m $MODEL -o public/images/petra_undercap &
wait

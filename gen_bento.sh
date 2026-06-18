#!/bin/bash
MODEL="gemini-2.5-flash-image"

nano-banana "Editorial photography of a beautiful Black woman wearing a lightweight sand-colored linen abaya. Elegant drape, warm sunny day, desert aesthetic, high fashion" -a 4:3 -m $MODEL -o public/images/oasis_abaya &

nano-banana "Editorial portrait of a beautiful Black woman wearing a terracotta hand-loomed cotton blend hijab with frayed edges. Beautiful organic texture, high fashion" -a 1:1 -m $MODEL -o public/images/nomad_hijab &

nano-banana "Fashion photography of a beautiful Black woman wearing a navy blue elegant maxi dress with a high neckline and cuffed sleeves. Sweeping silhouette, studio lighting" -a 4:3 -m $MODEL -o public/images/sahara_dress &

nano-banana "Fashion photography of a beautiful Black woman walking, wearing a modest taupe pleated skirt that moves beautifully, paired with a matching top and hijab. Urban street style" -a 4:3 -m $MODEL -o public/images/medina_skirt &

nano-banana "Fashion photography of a beautiful Black woman wearing a moss green soft crepe kimono cardigan worn open over a modest outfit with hijab. Elegant, minimal background" -a 4:3 -m $MODEL -o public/images/atlas_kimono &

wait

nano-banana "Ultra-wide cinematic close-up editorial beauty shot of a beautiful Black woman wearing a luxurious champagne silk hijab. Catching the light, ultra-realistic, high fashion" -a 21:9 -m $MODEL -o public/images/lumina_hijab &

nano-banana "Ultra-wide cinematic fashion photography of a beautiful Black woman walking gracefully wearing modest charcoal wide-leg trousers, long coat, and hijab. Urban street style" -a 21:9 -m $MODEL -o public/images/dune_trousers &

nano-banana "Editorial photography of a beautiful Black woman wearing a stunning ivory and gold hand-embroidered tunic, styled with a matching hijab. Artisan craftsmanship, natural lighting" -a 4:3 -m $MODEL -o public/images/heritage_tunic &

nano-banana "Ultra-wide cinematic fashion photography of a beautiful Black woman wearing a modest two-piece ribbed knit set in sage green, longline tunic and wide-leg trousers, with hijab. Relaxed, elegant" -a 21:9 -m $MODEL -o public/images/serene_knit &

nano-banana "Close-up beauty portrait of a beautiful Black woman wearing a white breathable bamboo undercap protecting her hair. Clean minimal aesthetic, skincare lighting" -a 4:3 -m $MODEL -o public/images/petra_undercap &

wait

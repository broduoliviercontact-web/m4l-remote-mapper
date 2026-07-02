# M4L-Remote-Target

This is the transparent Max Audio Effect target supplied with M4L Remote Mapper's nanoKONTROL2 demo.

## Use in Max for Live

1. Open `M4L-Remote-Target.maxpat` in Max from an empty Max Audio Effect.
2. If Max asks, save the resulting device in your Ableton User Library.
3. Save and load the device under the exact name **M4L-Remote-Target**.
4. Confirm in Live's Configure view that the continuous parameters are named `M4L Param 1` through `M4L Param 8`, and the button parameters are named `M4L Button 1` through `M4L Button 8`.

The patch passes stereo audio unchanged from `plugin~ 1 2` to `plugout~ 1 2`. Each dial is a floating-point parameter normalized from `0.0` to `1.0` and also broadcasts its value on `m4l_param_1` through `m4l_param_8` for optional internal Max testing. Eight visible `live.toggle` controls provide automated OFF/ON targets for button mappings.

Do not rename the device or its parameter Long Names: the generated Remote Script resolves both by name.

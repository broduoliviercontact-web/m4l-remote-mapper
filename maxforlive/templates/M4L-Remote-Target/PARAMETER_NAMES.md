# Parameter names

The following Long Names are part of the Remote Script contract and must remain exact:

All eight parameters are automated, visible to mapping, floating-point, and normalized to the range `0.0`–`1.0` with an initial value of `0.0`.
Each exposed parameter uses the same complete value for Long Name and Short Name. Visual labels may stay compact, but Live receives `M4L Param N` and `M4L Button N` consistently.

| Index | Ableton parameter name | Visual label | Internal send |
| ---: | --- | --- | --- |
| 1 | `M4L Param 1` | Param 1 | `m4l_param_1` |
| 2 | `M4L Param 2` | Param 2 | `m4l_param_2` |
| 3 | `M4L Param 3` | Param 3 | `m4l_param_3` |
| 4 | `M4L Param 4` | Param 4 | `m4l_param_4` |
| 5 | `M4L Param 5` | Param 5 | `m4l_param_5` |
| 6 | `M4L Param 6` | Param 6 | `m4l_param_6` |
| 7 | `M4L Param 7` | Param 7 | `m4l_param_7` |
| 8 | `M4L Param 8` | Param 8 | `m4l_param_8` |

The indices shown here are human-readable. The generated Remote Script's optional fallback indices are zero-based.
Index fallback is disabled by default because Max for Live parameter order is not guaranteed. Exact or normalized name matching is the safe default.

## Button parameters

| Index | Ableton parameter name | Visual label | Range |
| ---: | --- | --- | --- |
| 1 | `M4L Button 1` | B01 | OFF / ON |
| 2 | `M4L Button 2` | B02 | OFF / ON |
| 3 | `M4L Button 3` | B03 | OFF / ON |
| 4 | `M4L Button 4` | B04 | OFF / ON |
| 5 | `M4L Button 5` | B05 | OFF / ON |
| 6 | `M4L Button 6` | B06 | OFF / ON |
| 7 | `M4L Button 7` | B07 | OFF / ON |
| 8 | `M4L Button 8` | B08 | OFF / ON |

The Scripting Names are `m4l_button_1` through `m4l_button_8`. All toggles are exposed to Live automation and mapping.

The generated profile also includes three aliases per target: the complete name, the compact `Param N` / `Button N` name that some Live versions may report, and the Max Scripting Name.

## Button modes

- `momentary`: incoming press writes the parameter maximum; release writes its minimum.
- `toggle_from_input`: follows the controller's incoming ON/OFF value.
- `toggle_in_script`: each value-127 press flips an internal state; release value 0 is ignored.
- `trigger`: reacts only to value 127 and performs a pulse or global action without retaining continuous state.

MIDI always arrives as `0–127`. Continuous mappings normalize that value and scale it to `parameter.min` / `parameter.max`; button mappings write only the target minimum or maximum.

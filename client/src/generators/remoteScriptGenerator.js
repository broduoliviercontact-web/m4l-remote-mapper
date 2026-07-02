import {
  buildM4LButtonName,
  buildM4LParamName,
  normalizePrefix,
} from '../utils/m4lNaming.js'

const normalizeSlug = (value) => {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const safeSlug = slug || 'M4L_Remote_Mapper'
  return /^\d/.test(safeSlug) ? `M4L_${safeSlug}` : safeSlug
}

const pyString = (value) => JSON.stringify(String(value))
const pyBoolean = (value) => value === true ? 'True' : 'False'

const unique = (values) => [...new Set(values)]

function getMappingSlotNumber(mapping, target) {
  if (mapping.targetType === 'm4l_button') {
    const index = generateButtonNames(target).indexOf(mapping.targetButtonName)
    return Math.max(0, index) + 1
  }
  const index = generateParameterNames(target).indexOf(mapping.targetParameterName)
  return Math.max(0, index) + 1
}

function getParameterAliases(mapping, target) {
  const slotNumber = getMappingSlotNumber(mapping, target)
  if (mapping.targetType === 'm4l_button') {
    return unique([mapping.targetButtonName, `Button ${slotNumber}`, `m4l_button_${slotNumber}`])
  }
  return unique([mapping.targetParameterName, `Param ${slotNumber}`, `m4l_param_${slotNumber}`])
}

function createBuildId(profile) {
  const source = JSON.stringify(profile)
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `v01-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export const createScriptSlug = (deviceName) => `${normalizeSlug(deviceName)}_Remote`

export function generateParameterNames({ parameterCount, parameterPrefix }) {
  const prefix = normalizePrefix(parameterPrefix, 'M4L Param')
  return Array.from(
    { length: Math.max(1, Number(parameterCount) || 1) },
    (_, index) => buildM4LParamName(prefix, index),
  )
}

export function generateButtonNames({ buttonCount = 8, buttonPrefix = 'M4L Button' }) {
  const prefix = normalizePrefix(buttonPrefix, 'M4L Button')
  return Array.from(
    { length: Math.max(1, Number(buttonCount) || 1) },
    (_, index) => buildM4LButtonName(prefix, index),
  )
}

export function resolveMappingParameterIndex(mapping, target) {
  if (mapping.targetType === 'global_action') return null
  if (mapping.parameterIndex !== '' && mapping.parameterIndex != null) {
    return Number(mapping.parameterIndex)
  }
  if (mapping.targetType === 'm4l_button') {
    const buttonIndex = generateButtonNames(target).indexOf(mapping.targetButtonName)
    return Math.max(0, Number(target.parameterCount) || 0) + Math.max(0, buttonIndex)
  }
  return Math.max(0, generateParameterNames(target).indexOf(mapping.targetParameterName))
}

function buildPythonMappings(mappings, target) {
  const parameterPrefix = normalizePrefix(target.parameterPrefix, 'M4L Param')
  const buttonPrefix = normalizePrefix(target.buttonPrefix, 'M4L Button')
  const rows = mappings.map((mapping) => {
    const source = mapping.source
    if (mapping.targetType === 'global_action') {
      return `        {"channel": ${source.frameworkChannel}, "cc": ${source.data1}, "control_type": "button", "type": "global_action", "action": ${pyString(mapping.actionName)}, "button_mode": ${pyString(mapping.buttonMode || 'trigger')}, "trigger": ${pyString(mapping.triggerMode)}}`
    }
    if (mapping.targetType === 'm4l_button') {
      const buttonIndex = resolveMappingParameterIndex(mapping, target)
      return `        {"channel": ${source.frameworkChannel}, "cc": ${source.data1}, "control_type": "button", "type": "m4l_button", "device": ${pyString(mapping.targetDeviceName)}, "parameter": ${pyString(mapping.targetButtonName)}, "parameter_aliases": ${JSON.stringify(getParameterAliases(mapping, target))}, "expected_kind": "button", "expected_prefix": ${pyString(buttonPrefix)}, "allow_index_fallback": ${pyBoolean(mapping.allowIndexFallback)}, "button_mode": ${pyString(mapping.buttonMode || 'momentary')}, "button_id": ${pyString(`${source.frameworkChannel}:${source.data1}`)}, "parameter_index": ${buttonIndex}}`
    }
    const parameterIndex = resolveMappingParameterIndex(mapping, target)
    return `        {"channel": ${source.frameworkChannel}, "cc": ${source.data1}, "control_type": "continuous", "type": "m4l_parameter", "device": ${pyString(mapping.targetDeviceName)}, "parameter": ${pyString(mapping.targetParameterName)}, "parameter_aliases": ${JSON.stringify(getParameterAliases(mapping, target))}, "expected_kind": "parameter", "expected_prefix": ${pyString(parameterPrefix)}, "allow_index_fallback": ${pyBoolean(mapping.allowIndexFallback)}, "scaling": "parameter_min_max", "parameter_index": ${parameterIndex}}`
  })
  return rows.length ? `${rows.join(',\n')}\n` : ''
}

export function generateRemoteScriptFiles({ target, mappings, scriptSlug = createScriptSlug(target.targetDeviceName) }) {
  const profile = {
    schemaVersion: '0.1',
    scriptSlug,
    target,
    mappings: mappings.map((mapping) => ({
      source: mapping.source,
      controlType: mapping.controlType || (mapping.targetType === 'm4l_parameter' ? 'continuous' : 'button'),
      targetType: mapping.targetType,
      allowIndexFallback: mapping.allowIndexFallback === true,
      ...(mapping.targetType === 'global_action'
        ? {
            actionName: mapping.actionName,
            buttonMode: mapping.buttonMode || 'trigger',
            triggerMode: mapping.triggerMode,
          }
        : mapping.targetType === 'm4l_button'
          ? {
              targetDeviceName: mapping.targetDeviceName,
              targetButtonName: mapping.targetButtonName,
              parameter_aliases: getParameterAliases(mapping, target),
              buttonMode: mapping.buttonMode || 'momentary',
              parameterIndex: resolveMappingParameterIndex(mapping, target),
            }
          : {
            targetDeviceName: mapping.targetDeviceName,
            targetParameterName: mapping.targetParameterName,
            parameter_aliases: getParameterAliases(mapping, target),
            scaling: mapping.scaling || 'parameter_min_max',
            parameterIndex: resolveMappingParameterIndex(mapping, target),
          }),
    })),
  }

  const initPy = `from .${scriptSlug} import ${scriptSlug}\n\n\ndef create_instance(c_instance):\n    return ${scriptSlug}(c_instance)\n`
  const buildId = createBuildId(profile)

  const scriptPy = `# Generated by M4L Remote Mapper v0.1
import Live
from _Framework.ControlSurface import ControlSurface
from _Framework.InputControlElement import MIDI_CC_TYPE
from _Framework.EncoderElement import EncoderElement


class ${scriptSlug}(ControlSurface):
    BUILD_ID = ${pyString(buildId)}
    MAPPINGS = [
${buildPythonMappings(mappings, target)}    ]

    def __init__(self, c_instance):
        super(${scriptSlug}, self).__init__(c_instance)
        with self.component_guard():
            self._log("script loaded build_id={}".format(self.BUILD_ID))
            self._setup_mappings()

    def _log(self, message):
        text = "(M4L Remote Mapper) {}".format(message)
        try:
            self.c_instance().log_message(text)
            return
        except Exception:
            pass
        try:
            self.canonical_parent.log_message(text)
            return
        except Exception:
            pass
        try:
            self.show_message(text)
        except Exception:
            pass

    def _setup_mappings(self):
        self._mappings = list(self.MAPPINGS)
        self._controls = []
        self._button_states = {}
        for mapping in self._mappings:
            control = EncoderElement(
                MIDI_CC_TYPE,
                mapping["channel"],
                mapping["cc"],
                Live.MidiMap.MapMode.absolute
            )
            control.add_value_listener(self._make_value_listener(mapping))
            self._controls.append(control)
            self._log("listening CC channel={} cc={}".format(mapping["channel"], mapping["cc"]))

    def _make_value_listener(self, mapping):
        def listener(value):
            self._log("CC received channel={} cc={} value={}".format(mapping["channel"], mapping["cc"], value))
            self._apply_mapping(mapping, value)
        return listener

    def _apply_mapping(self, mapping, value):
        if mapping["type"] == "global_action":
            self._run_global_action(mapping, value)
            return
        parameter = self._find_parameter(mapping)
        if parameter is None:
            return
        if mapping["type"] == "m4l_button":
            self._apply_button_mapping(mapping, value, parameter)
            return
        scaled_value = self._scale_midi_to_parameter(value, parameter)
        parameter.value = scaled_value
        self._log("parameter updated: {} value={} scaled={}".format(parameter.name, value, scaled_value))

    def _apply_button_mapping(self, mapping, value, parameter):
        button_mode = mapping.get("button_mode", "momentary")
        if button_mode in ("momentary", "toggle_from_input"):
            parameter.value = parameter.max if value > 0 else parameter.min
            self._log("button updated: {} mode={} value={}".format(parameter.name, button_mode, value))
            return
        if button_mode == "toggle_in_script":
            if value != 127:
                return
            button_id = mapping.get("button_id", "{}:{}".format(mapping["channel"], mapping["cc"]))
            state = not self._button_states.get(button_id, False)
            self._button_states[button_id] = state
            parameter.value = parameter.max if state else parameter.min
            self._log("button toggled: {} state={}".format(parameter.name, state))
            return
        if button_mode == "trigger":
            if value != 127:
                return
            parameter.value = parameter.max
            parameter.value = parameter.min
            self._log("button triggered: {}".format(parameter.name))

    def _scale_midi_to_parameter(self, midi_value, parameter):
        try:
            minimum = float(parameter.min)
            maximum = float(parameter.max)
            normalized = max(0.0, min(1.0, float(midi_value) / 127.0))
            return minimum + ((maximum - minimum) * normalized)
        except Exception:
            return max(0.0, min(1.0, float(midi_value) / 127.0))

    def _run_global_action(self, mapping, value):
        if mapping["action"] != "Capture MIDI":
            return
        if mapping["trigger"] != "value_eq_127":
            return
        if value == 127:
            self._log("M4L Remote Mapper: global action requested: Capture MIDI")
            self._log("M4L Remote Mapper: capture_midi requested")
            try:
                self.song().capture_midi()
                self._log("M4L Remote Mapper: capture_midi success")
            except Exception as error:
                self._log("M4L Remote Mapper: capture_midi error: %s" % error)

    def _find_parameter(self, mapping):
        target_device = None
        for track in list(self.song().tracks) + list(self.song().return_tracks):
            target_device = self._find_device_in_chain(track.devices, mapping["device"])
            if target_device is not None:
                break
        if target_device is None:
            self._log("target device missing: {}".format(mapping["device"]))
            return None
        self._log("target device found: {}".format(mapping["device"]))

        exact_name = mapping["parameter"]
        aliases = mapping.get("parameter_aliases", [exact_name])
        for alias in aliases:
            for parameter in target_device.parameters:
                if parameter.name == alias and self._is_parameter_compatible_with_mapping(mapping, parameter):
                    self._log("parameter found: {} alias={}".format(parameter.name, alias))
                    return parameter

        normalized_aliases = [self._normalize_name(alias) for alias in aliases]
        for parameter in target_device.parameters:
            if self._normalize_name(parameter.name) in normalized_aliases and self._is_parameter_compatible_with_mapping(mapping, parameter):
                self._log("parameter found normalized: {}".format(parameter.name))
                return parameter

        self._log("parameter missing by aliases: {}".format(aliases))
        self._log("available parameters: {}".format(", ".join([parameter.name for parameter in target_device.parameters])))
        if mapping.get("allow_index_fallback") is not True:
            self._log("index fallback disabled for {}".format(exact_name))
            return None

        automatable_parameters = [parameter for parameter in target_device.parameters if parameter.name != "Device On"]
        index = mapping.get("parameter_index")
        if index is None or index < 0 or index >= len(automatable_parameters):
            self._log("unsafe fallback rejected: target={} index={} resolved=out_of_range".format(exact_name, index))
            return None
        fallback_parameter = automatable_parameters[index]
        if not self._is_safe_fallback(mapping, fallback_parameter):
            self._log("unsafe fallback rejected: target={} index={} resolved={}".format(exact_name, index, fallback_parameter.name))
            return None
        self._log("safe fallback accepted: target={} index={} resolved={}".format(exact_name, index, fallback_parameter.name))
        return fallback_parameter

    def _is_safe_fallback(self, mapping, parameter):
        if not self._is_parameter_compatible_with_mapping(mapping, parameter):
            return False
        parameter_name = self._normalize_name(parameter.name)
        expected_prefix = self._normalize_name(mapping.get("expected_prefix", ""))
        prefix_matches = bool(expected_prefix) and parameter_name.startswith(expected_prefix)
        expected_kind = mapping.get("expected_kind")
        if expected_kind == "parameter":
            return "button" not in parameter_name and ("param" in parameter_name or prefix_matches)
        if expected_kind == "button":
            return "param" not in parameter_name and ("button" in parameter_name or prefix_matches)
        return False

    def _is_parameter_compatible_with_mapping(self, mapping, parameter):
        parameter_name = self._normalize_name(parameter.name)
        expected_kind = mapping.get("expected_kind")
        if expected_kind == "parameter":
            return "button" not in parameter_name
        if expected_kind == "button":
            return "button" in parameter_name
        return False

    def _find_device_in_chain(self, devices, target_name):
        normalized_target = self._normalize_name(target_name)
        for device in devices:
            if device.name == target_name or self._normalize_name(device.name) == normalized_target:
                return device
            if getattr(device, "can_have_chains", False):
                for chain in device.chains:
                    nested = self._find_device_in_chain(chain.devices, target_name)
                    if nested is not None:
                        return nested
        return None

    @staticmethod
    def _normalize_name(value):
        return "".join(character.lower() for character in value if character.isalnum())
`

  const readme = `# ${target.targetDeviceName} Remote Pack

Generated by M4L Remote Mapper. This pack connects MIDI CC messages to named Max for Live parameters and Ableton global actions.

## Profile

- Target device: **${target.targetDeviceName}**
- Parameters: **${target.parameterCount}**
- Buttons: **${target.buttonCount || 8}**
- Active mappings: **${mappings.length}**
- Remote Script folder: \`${scriptSlug}\`

See \`3_READ_ME_FIRST.md\` for setup instructions. The ready-to-open Max patch is in \`2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/\`.
`

  const installation = `# Installation

1. Quit Ableton Live.
2. Copy only \`1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/${scriptSlug}\` into Ableton's User Remote Scripts folder.
   - macOS: \`~/Music/Ableton/User Library/Remote Scripts/\`
   - Windows: \`%USERPROFILE%\\Documents\\Ableton\\User Library\\Remote Scripts\\\`
3. Open \`2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/M4L-Remote-Target.maxpat\` in Max for Live and save the device under the exact name **M4L-Remote-Target** if necessary.
4. Restart Live and open **Settings → Link, Tempo & MIDI**.
5. Select **${scriptSlug}** as Control Surface, **nanoKONTROL2 SLIDER/KNOB** as Input, and **None** as Output.
6. Add the Max for Live device named **${target.targetDeviceName}** to a track.
7. Move a mapped control and verify the parameter response.

If nothing moves, verify that the controller sends the same channel and CC numbers as \`profile.json\`, and that all Max parameters use the exact Long Names from the spec.
`

  return {
    scriptSlug,
    '__init__.py': initPy,
    [`${scriptSlug}.py`]: scriptPy,
    'profile.json': `${JSON.stringify(profile, null, 2)}\n`,
    'README.md': readme,
    'INSTALLATION.md': installation,
  }
}

export function generateM4LSpec(target) {
  const names = generateParameterNames(target)
  const buttonNames = generateButtonNames(target)
  return `# ${target.targetDeviceName} — ${target.parameterCount} Parameter Specification

The Max for Live device must be named **${target.targetDeviceName}**. Add exposed \`live.dial\` or \`live.toggle\` objects and set their **Long Name** exactly as follows:

${names.map((name, index) => `${index + 1}. \`${name}\``).join('\n')}

Add exposed \`live.toggle\` objects with these Long Names:

${buttonNames.map((name, index) => `${index + 1}. \`${name}\``).join('\n')}

## Contract

- Parameter names are matched exactly first, then with spaces and punctuation removed.
- Keep every mapped control visible to Live's parameter system.
- Parameter indices are optional fallbacks and are zero-based in the generated profile.
- Save the finished device as an \`.amxd\` and place it wherever your User Library expects Max for Live devices.
`
}

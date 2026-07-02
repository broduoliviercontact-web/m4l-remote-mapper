{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 6,
      "revision": 5,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [100.0, 100.0, 980.0, 440.0],
    "presentation_rect": [0.0, 0.0, 550.0, 185.0],
    "openinpresentation": 1,
    "default_fontname": "Arial",
    "default_fontsize": 12.0,
    "gridonopen": 1,
    "gridsize": [15.0, 15.0],
    "boxes": [
      {
        "box": {
          "id": "obj-panel",
          "maxclass": "panel",
          "background": 1,
          "border": 1,
          "bordercolor": [0.28, 0.3, 0.26, 1.0],
          "bgcolor": [0.09, 0.1, 0.08, 1.0],
          "patching_rect": [20.0, 10.0, 920.0, 290.0],
          "presentation": 1,
          "presentation_rect": [4.0, 4.0, 542.0, 177.0],
          "rounded": 0
        }
      },
      {
        "box": {
          "id": "obj-title",
          "maxclass": "comment",
          "text": "M4L Remote Target",
          "patching_rect": [40.0, 25.0, 180.0, 20.0],
          "presentation": 1,
          "presentation_rect": [16.0, 8.0, 180.0, 20.0]
        }
      },
      {
        "box": {
          "id": "obj-subtitle",
          "maxclass": "comment",
          "text": "Expected parameters: M4L Param 1 ... M4L Param 8",
          "patching_rect": [220.0, 25.0, 300.0, 20.0],
          "presentation": 1,
          "presentation_rect": [196.0, 8.0, 300.0, 20.0]
        }
      },
      {
        "box": {
          "id": "obj-target-note",
          "maxclass": "comment",
          "text": "Remote Script target device name: M4L-Remote-Target",
          "patching_rect": [220.0, 50.0, 360.0, 20.0],
          "presentation": 1,
          "presentation_rect": [16.0, 146.0, 390.0, 20.0]
        }
      },
      {
        "box": {
          "id": "obj-monitor-note",
          "maxclass": "comment",
          "text": "CC16–19 monitors",
          "patching_rect": [220.0, 75.0, 180.0, 20.0],
          "presentation": 1,
          "presentation_rect": [414.0, 146.0, 115.0, 20.0]
        }
      },
      {
        "box": {
          "id": "obj-plugin",
          "maxclass": "newobj",
          "text": "plugin~ 1 2",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["signal", "signal"],
          "patching_rect": [40.0, 330.0, 78.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-plugout",
          "maxclass": "newobj",
          "text": "plugout~ 1 2",
          "numinlets": 2,
          "numoutlets": 0,
          "patching_rect": [40.0, 385.0, 82.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-dial-1",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "float"],
          "parameter_enable": 1,
          "patching_rect": [165.0, 105.0, 48.0, 48.0],
          "presentation": 1,
          "presentation_rect": [16.0, 40.0, 56.0, 56.0],
          "varname": "m4l_param_1",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [0.0],
              "parameter_initial_enable": 1,
              "parameter_invisible": 0,
              "parameter_longname": "M4L Param 1",
              "parameter_mmax": 1.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "Param 1",
              "parameter_type": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-dial-2",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "float"],
          "parameter_enable": 1,
          "patching_rect": [260.0, 105.0, 48.0, 48.0],
          "presentation": 1,
          "presentation_rect": [82.0, 40.0, 56.0, 56.0],
          "varname": "m4l_param_2",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [0.0],
              "parameter_initial_enable": 1,
              "parameter_invisible": 0,
              "parameter_longname": "M4L Param 2",
              "parameter_mmax": 1.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "Param 2",
              "parameter_type": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-dial-3",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "float"],
          "parameter_enable": 1,
          "patching_rect": [355.0, 105.0, 48.0, 48.0],
          "presentation": 1,
          "presentation_rect": [148.0, 40.0, 56.0, 56.0],
          "varname": "m4l_param_3",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [0.0],
              "parameter_initial_enable": 1,
              "parameter_invisible": 0,
              "parameter_longname": "M4L Param 3",
              "parameter_mmax": 1.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "Param 3",
              "parameter_type": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-dial-4",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "float"],
          "parameter_enable": 1,
          "patching_rect": [450.0, 105.0, 48.0, 48.0],
          "presentation": 1,
          "presentation_rect": [214.0, 40.0, 56.0, 56.0],
          "varname": "m4l_param_4",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [0.0],
              "parameter_initial_enable": 1,
              "parameter_invisible": 0,
              "parameter_longname": "M4L Param 4",
              "parameter_mmax": 1.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "Param 4",
              "parameter_type": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-dial-5",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "float"],
          "parameter_enable": 1,
          "patching_rect": [545.0, 105.0, 48.0, 48.0],
          "presentation": 1,
          "presentation_rect": [280.0, 40.0, 56.0, 56.0],
          "varname": "m4l_param_5",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [0.0],
              "parameter_initial_enable": 1,
              "parameter_invisible": 0,
              "parameter_longname": "M4L Param 5",
              "parameter_mmax": 1.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "Param 5",
              "parameter_type": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-dial-6",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "float"],
          "parameter_enable": 1,
          "patching_rect": [640.0, 105.0, 48.0, 48.0],
          "presentation": 1,
          "presentation_rect": [346.0, 40.0, 56.0, 56.0],
          "varname": "m4l_param_6",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [0.0],
              "parameter_initial_enable": 1,
              "parameter_invisible": 0,
              "parameter_longname": "M4L Param 6",
              "parameter_mmax": 1.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "Param 6",
              "parameter_type": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-dial-7",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "float"],
          "parameter_enable": 1,
          "patching_rect": [735.0, 105.0, 48.0, 48.0],
          "presentation": 1,
          "presentation_rect": [412.0, 40.0, 56.0, 56.0],
          "varname": "m4l_param_7",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [0.0],
              "parameter_initial_enable": 1,
              "parameter_invisible": 0,
              "parameter_longname": "M4L Param 7",
              "parameter_mmax": 1.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "Param 7",
              "parameter_type": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-dial-8",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "float"],
          "parameter_enable": 1,
          "patching_rect": [830.0, 105.0, 48.0, 48.0],
          "presentation": 1,
          "presentation_rect": [478.0, 40.0, 56.0, 56.0],
          "varname": "m4l_param_8",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [0.0],
              "parameter_initial_enable": 1,
              "parameter_invisible": 0,
              "parameter_longname": "M4L Param 8",
              "parameter_mmax": 1.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "Param 8",
              "parameter_type": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-send-1",
          "maxclass": "newobj",
          "text": "s m4l_param_1",
          "patching_rect": [155.0, 205.0, 95.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-send-2",
          "maxclass": "newobj",
          "text": "s m4l_param_2",
          "patching_rect": [250.0, 205.0, 95.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-send-3",
          "maxclass": "newobj",
          "text": "s m4l_param_3",
          "patching_rect": [345.0, 205.0, 95.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-send-4",
          "maxclass": "newobj",
          "text": "s m4l_param_4",
          "patching_rect": [440.0, 205.0, 95.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-send-5",
          "maxclass": "newobj",
          "text": "s m4l_param_5",
          "patching_rect": [535.0, 205.0, 95.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-send-6",
          "maxclass": "newobj",
          "text": "s m4l_param_6",
          "patching_rect": [630.0, 205.0, 95.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-send-7",
          "maxclass": "newobj",
          "text": "s m4l_param_7",
          "patching_rect": [725.0, 205.0, 95.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-send-8",
          "maxclass": "newobj",
          "text": "s m4l_param_8",
          "patching_rect": [820.0, 205.0, 95.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-monitor-1",
          "maxclass": "flonum",
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "bang"],
          "parameter_enable": 0,
          "patching_rect": [165.0, 165.0, 56.0, 22.0],
          "presentation": 1,
          "presentation_rect": [16.0, 105.0, 56.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-monitor-2",
          "maxclass": "flonum",
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "bang"],
          "parameter_enable": 0,
          "patching_rect": [260.0, 165.0, 56.0, 22.0],
          "presentation": 1,
          "presentation_rect": [82.0, 105.0, 56.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-monitor-3",
          "maxclass": "flonum",
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "bang"],
          "parameter_enable": 0,
          "patching_rect": [355.0, 165.0, 56.0, 22.0],
          "presentation": 1,
          "presentation_rect": [148.0, 105.0, 56.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-monitor-4",
          "maxclass": "flonum",
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", "bang"],
          "parameter_enable": 0,
          "patching_rect": [450.0, 165.0, 56.0, 22.0],
          "presentation": 1,
          "presentation_rect": [214.0, 105.0, 56.0, 22.0]
        }
      }
    ],
    "lines": [
      { "patchline": { "source": ["obj-plugin", 0], "destination": ["obj-plugout", 0] } },
      { "patchline": { "source": ["obj-plugin", 1], "destination": ["obj-plugout", 1] } },
      { "patchline": { "source": ["obj-dial-1", 0], "destination": ["obj-send-1", 0] } },
      { "patchline": { "source": ["obj-dial-2", 0], "destination": ["obj-send-2", 0] } },
      { "patchline": { "source": ["obj-dial-3", 0], "destination": ["obj-send-3", 0] } },
      { "patchline": { "source": ["obj-dial-4", 0], "destination": ["obj-send-4", 0] } },
      { "patchline": { "source": ["obj-dial-5", 0], "destination": ["obj-send-5", 0] } },
      { "patchline": { "source": ["obj-dial-6", 0], "destination": ["obj-send-6", 0] } },
      { "patchline": { "source": ["obj-dial-7", 0], "destination": ["obj-send-7", 0] } },
      { "patchline": { "source": ["obj-dial-8", 0], "destination": ["obj-send-8", 0] } },
      { "patchline": { "source": ["obj-dial-1", 0], "destination": ["obj-monitor-1", 0] } },
      { "patchline": { "source": ["obj-dial-2", 0], "destination": ["obj-monitor-2", 0] } },
      { "patchline": { "source": ["obj-dial-3", 0], "destination": ["obj-monitor-3", 0] } },
      { "patchline": { "source": ["obj-dial-4", 0], "destination": ["obj-monitor-4", 0] } }
    ],
    "parameters": {
      "obj-dial-1": ["M4L Param 1", "Param 1", 0],
      "obj-dial-2": ["M4L Param 2", "Param 2", 0],
      "obj-dial-3": ["M4L Param 3", "Param 3", 0],
      "obj-dial-4": ["M4L Param 4", "Param 4", 0],
      "obj-dial-5": ["M4L Param 5", "Param 5", 0],
      "obj-dial-6": ["M4L Param 6", "Param 6", 0],
      "obj-dial-7": ["M4L Param 7", "Param 7", 0],
      "obj-dial-8": ["M4L Param 8", "Param 8", 0]
    },
    "parameterbanks": {},
    "dependency_cache": [],
    "autosave": 0
  }
}

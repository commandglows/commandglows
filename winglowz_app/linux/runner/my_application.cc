#include "my_application.h"

#include <chrono>
#include <cstring>

#include <flutter_linux/flutter_linux.h>
#ifdef GDK_WINDOWING_X11
#include <gdk/gdkx.h>
#endif

#include "flutter/generated_plugin_registrant.h"

struct _MyApplication {
  GtkApplication parent_instance;
  char** dart_entrypoint_arguments;
  GtkWindow* window;
  FlMethodChannel* linux_overlay_channel;
  gboolean overlay_enabled;
  gboolean overlay_visible;
  gboolean hotkey_registered;
  gdouble overlay_size_scale;
  gdouble overlay_opacity;
  gchar* last_error_code;
  gchar* last_error_message;
  GPtrArray* overlay_events;
};

G_DEFINE_TYPE(MyApplication, my_application, GTK_TYPE_APPLICATION)

static gint64 current_epoch_millis() {
  const auto now = std::chrono::system_clock::now();
  return std::chrono::duration_cast<std::chrono::milliseconds>(
             now.time_since_epoch())
      .count();
}

static FlValue* linux_overlay_status(MyApplication* self) {
  FlValue* status = fl_value_new_map();
  fl_value_set_string_take(status, "platform", fl_value_new_string("linux"));
  fl_value_set_string_take(status, "supported", fl_value_new_bool(TRUE));
  fl_value_set_string_take(status, "enabled",
                           fl_value_new_bool(self->overlay_enabled));
  fl_value_set_string_take(status, "visible",
                           fl_value_new_bool(self->overlay_visible));
  fl_value_set_string_take(status, "hotkeyRegistered",
                           fl_value_new_bool(self->hotkey_registered));
  fl_value_set_string_take(status, "hotkeyLabel",
                           fl_value_new_string("Ctrl+Alt+Space"));
  fl_value_set_string_take(status, "deliveryMode",
                           fl_value_new_string("clipboard_only"));
  fl_value_set_string_take(status, "sizeScale",
                           fl_value_new_float(self->overlay_size_scale));
  fl_value_set_string_take(status, "opacity",
                           fl_value_new_float(self->overlay_opacity));
  fl_value_set_string_take(
      status, "eventQueueSize",
      fl_value_new_int(self->overlay_events != nullptr
                           ? static_cast<int64_t>(self->overlay_events->len)
                           : 0));
  if (self->last_error_code != nullptr) {
    fl_value_set_string_take(status, "lastErrorCode",
                             fl_value_new_string(self->last_error_code));
    fl_value_set_string_take(status, "lastErrorMessage",
                             fl_value_new_string(self->last_error_message));
  }
  return status;
}

static FlValue* linux_overlay_delivery_result(gboolean clipboard_copied,
                                              gboolean paste_attempted,
                                              gboolean paste_succeeded,
                                              const gchar* error_code,
                                              const gchar* error_message) {
  FlValue* result = fl_value_new_map();
  fl_value_set_string_take(
      result, "status",
      fl_value_new_string(paste_succeeded
                              ? "delivered"
                              : (clipboard_copied ? "clipboard_only"
                                                  : "failed")));
  fl_value_set_string_take(result, "clipboardCopied",
                           fl_value_new_bool(clipboard_copied));
  fl_value_set_string_take(result, "pasteAttempted",
                           fl_value_new_bool(paste_attempted));
  fl_value_set_string_take(result, "pasteSucceeded",
                           fl_value_new_bool(paste_succeeded));
  if (error_code != nullptr && strlen(error_code) > 0) {
    fl_value_set_string_take(result, "errorCode",
                             fl_value_new_string(error_code));
    fl_value_set_string_take(result, "errorMessage",
                             fl_value_new_string(error_message));
  }
  return result;
}

static FlValue* linux_overlay_command_result(const gchar* status,
                                             gint64 sent_steps,
                                             const gchar* error_code,
                                             const gchar* error_message) {
  FlValue* result = fl_value_new_map();
  fl_value_set_string_take(result, "status", fl_value_new_string(status));
  fl_value_set_string_take(result, "sentSteps", fl_value_new_int(sent_steps));
  if (error_code != nullptr && strlen(error_code) > 0) {
    fl_value_set_string_take(result, "errorCode",
                             fl_value_new_string(error_code));
    fl_value_set_string_take(result, "errorMessage",
                             fl_value_new_string(error_message));
  }
  return result;
}

static void linux_overlay_set_error(MyApplication* self, const gchar* code,
                                    const gchar* message) {
  g_clear_pointer(&self->last_error_code, g_free);
  g_clear_pointer(&self->last_error_message, g_free);
  self->last_error_code = g_strdup(code);
  self->last_error_message = g_strdup(message);
}

static void linux_overlay_clear_error(MyApplication* self) {
  g_clear_pointer(&self->last_error_code, g_free);
  g_clear_pointer(&self->last_error_message, g_free);
}

static void linux_overlay_push_event(MyApplication* self, const gchar* trigger) {
  if (self->overlay_events == nullptr) {
    self->overlay_events =
        g_ptr_array_new_with_free_func(reinterpret_cast<GDestroyNotify>(
            fl_value_unref));
  }
  FlValue* event = fl_value_new_map();
  fl_value_set_string_take(event, "trigger", fl_value_new_string(trigger));
  fl_value_set_string_take(event, "capturedAtEpochMillis",
                           fl_value_new_int(current_epoch_millis()));
  g_ptr_array_add(self->overlay_events, event);
}

static gboolean linux_overlay_key_press(GtkWidget* widget, GdkEventKey* event,
                                        gpointer user_data) {
  MyApplication* self = MY_APPLICATION(user_data);
  if (event->keyval == GDK_KEY_space &&
      (event->state & GDK_CONTROL_MASK) != 0 &&
      (event->state & GDK_MOD1_MASK) != 0) {
    linux_overlay_push_event(self, "hotkey");
    gtk_window_set_keep_above(self->window, TRUE);
    gtk_window_present(self->window);
    gtk_widget_set_opacity(GTK_WIDGET(self->window), self->overlay_opacity);
    self->overlay_visible = TRUE;
    return TRUE;
  }
  return FALSE;
}

static void linux_overlay_method_call_cb(FlMethodChannel* channel,
                                         FlMethodCall* method_call,
                                         gpointer user_data) {
  MyApplication* self = MY_APPLICATION(user_data);
  const gchar* method = fl_method_call_get_name(method_call);
  g_autoptr(FlMethodResponse) response = nullptr;

  if (strcmp(method, "getLinuxOverlayStatus") == 0) {
    response = FL_METHOD_RESPONSE(fl_method_success_response_new(
        linux_overlay_status(self)));
  } else if (strcmp(method, "setLinuxOverlayEnabled") == 0) {
    linux_overlay_clear_error(self);
    FlValue* args = fl_method_call_get_args(method_call);
    gboolean enabled = FALSE;
    if (fl_value_get_type(args) == FL_VALUE_TYPE_MAP) {
      FlValue* raw_enabled = fl_value_lookup_string(args, "enabled");
      if (raw_enabled != nullptr &&
          fl_value_get_type(raw_enabled) == FL_VALUE_TYPE_BOOL) {
        enabled = fl_value_get_bool(raw_enabled);
      }
    }
    self->overlay_enabled = enabled;
    self->hotkey_registered = enabled;
    if (enabled) {
      linux_overlay_set_error(
          self, "HOTKEY_SCOPE_LIMITED",
          "Linux Ctrl+Alt+Space is registered inside the GTK window only; "
          "system-wide registration depends on the compositor/window manager.");
    }
    response = FL_METHOD_RESPONSE(fl_method_success_response_new(
        linux_overlay_status(self)));
  } else if (strcmp(method, "showLinuxOverlay") == 0) {
    gtk_window_set_keep_above(self->window, TRUE);
    gtk_widget_set_opacity(GTK_WIDGET(self->window), self->overlay_opacity);
    gtk_window_present(self->window);
    self->overlay_visible = TRUE;
    response = FL_METHOD_RESPONSE(fl_method_success_response_new(
        linux_overlay_status(self)));
  } else if (strcmp(method, "hideLinuxOverlay") == 0) {
    gtk_widget_hide(GTK_WIDGET(self->window));
    self->overlay_visible = FALSE;
    response = FL_METHOD_RESPONSE(fl_method_success_response_new(
        linux_overlay_status(self)));
  } else if (strcmp(method, "deliverLinuxOverlayKeySequence") == 0) {
    response = FL_METHOD_RESPONSE(fl_method_success_response_new(
        linux_overlay_command_result(
            "unsupported", 0, "KEY_SEQUENCE_UNSUPPORTED",
            "Linux desktop overlay does not support native key sequence delivery yet.")));
  } else if (strcmp(method, "setLinuxOverlayAppearance") == 0) {
    FlValue* args = fl_method_call_get_args(method_call);
    if (fl_value_get_type(args) == FL_VALUE_TYPE_MAP) {
      FlValue* size_scale = fl_value_lookup_string(args, "sizeScale");
      if (size_scale != nullptr &&
          fl_value_get_type(size_scale) == FL_VALUE_TYPE_FLOAT) {
        self->overlay_size_scale = fl_value_get_float(size_scale);
      }
      FlValue* opacity = fl_value_lookup_string(args, "opacity");
      if (opacity != nullptr &&
          fl_value_get_type(opacity) == FL_VALUE_TYPE_FLOAT) {
        self->overlay_opacity = fl_value_get_float(opacity);
      }
    }
    gtk_widget_set_opacity(GTK_WIDGET(self->window), self->overlay_opacity);
    response = FL_METHOD_RESPONSE(fl_method_success_response_new(
        linux_overlay_status(self)));
  } else if (strcmp(method, "deliverLinuxOverlayText") == 0) {
    FlValue* args = fl_method_call_get_args(method_call);
    const gchar* text = "";
    if (fl_value_get_type(args) == FL_VALUE_TYPE_MAP) {
      FlValue* raw_text = fl_value_lookup_string(args, "text");
      if (raw_text != nullptr &&
          fl_value_get_type(raw_text) == FL_VALUE_TYPE_STRING) {
        text = fl_value_get_string(raw_text);
      }
    }
    if (text == nullptr || strlen(text) == 0) {
      response = FL_METHOD_RESPONSE(fl_method_success_response_new(
          linux_overlay_delivery_result(FALSE, FALSE, FALSE, "EMPTY_TEXT",
                                        "No text to deliver.")));
    } else {
      GtkClipboard* clipboard = gtk_clipboard_get(GDK_SELECTION_CLIPBOARD);
      gtk_clipboard_set_text(clipboard, text, -1);
      gtk_clipboard_store(clipboard);
      response = FL_METHOD_RESPONSE(fl_method_success_response_new(
          linux_overlay_delivery_result(TRUE, FALSE, FALSE, nullptr,
                                        nullptr)));
    }
  } else if (strcmp(method, "drainLinuxOverlayEvents") == 0) {
    FlValue* events = fl_value_new_list();
    if (self->overlay_events != nullptr) {
      for (guint i = 0; i < self->overlay_events->len; i++) {
        FlValue* event =
            FL_VALUE(g_ptr_array_index(self->overlay_events, i));
        fl_value_append_take(events, fl_value_ref(event));
      }
      g_ptr_array_set_size(self->overlay_events, 0);
    }
    response =
        FL_METHOD_RESPONSE(fl_method_success_response_new(events));
  } else {
    response = FL_METHOD_RESPONSE(fl_method_not_implemented_response_new());
  }

  fl_method_call_respond(method_call, response, nullptr);
}

static void register_linux_overlay_channel(MyApplication* self, FlView* view) {
  FlBinaryMessenger* messenger = fl_engine_get_binary_messenger(fl_view_get_engine(view));
  g_autoptr(FlStandardMethodCodec) codec = fl_standard_method_codec_new();
  self->linux_overlay_channel = fl_method_channel_new(
      messenger, "commandglows_app/linux_overlay", FL_METHOD_CODEC(codec));
  fl_method_channel_set_method_call_handler(
      self->linux_overlay_channel, linux_overlay_method_call_cb, self, nullptr);
}

// Called when first Flutter frame received.
static void first_frame_cb(MyApplication* self, FlView* view) {
  gtk_widget_show(gtk_widget_get_toplevel(GTK_WIDGET(view)));
}

// Implements GApplication::activate.
static void my_application_activate(GApplication* application) {
  MyApplication* self = MY_APPLICATION(application);
  GtkWindow* window =
      GTK_WINDOW(gtk_application_window_new(GTK_APPLICATION(application)));
  self->window = window;

  // Use a header bar when running in GNOME as this is the common style used
  // by applications and is the setup most users will be using (e.g. Ubuntu
  // desktop).
  // If running on X and not using GNOME then just use a traditional title bar
  // in case the window manager does more exotic layout, e.g. tiling.
  // If running on Wayland assume the header bar will work (may need changing
  // if future cases occur).
  gboolean use_header_bar = TRUE;
#ifdef GDK_WINDOWING_X11
  GdkScreen* screen = gtk_window_get_screen(window);
  if (GDK_IS_X11_SCREEN(screen)) {
    const gchar* wm_name = gdk_x11_screen_get_window_manager_name(screen);
    if (g_strcmp0(wm_name, "GNOME Shell") != 0) {
      use_header_bar = FALSE;
    }
  }
#endif
  if (use_header_bar) {
    GtkHeaderBar* header_bar = GTK_HEADER_BAR(gtk_header_bar_new());
    gtk_widget_show(GTK_WIDGET(header_bar));
    gtk_header_bar_set_title(header_bar, "CommandGlows");
    gtk_header_bar_set_show_close_button(header_bar, TRUE);
    gtk_window_set_titlebar(window, GTK_WIDGET(header_bar));
  } else {
    gtk_window_set_title(window, "CommandGlows");
  }

  gtk_window_set_default_size(window, 1280, 720);
  gtk_widget_add_events(GTK_WIDGET(window), GDK_KEY_PRESS_MASK);
  g_signal_connect(window, "key-press-event",
                   G_CALLBACK(linux_overlay_key_press), self);

  g_autoptr(FlDartProject) project = fl_dart_project_new();
  fl_dart_project_set_dart_entrypoint_arguments(
      project, self->dart_entrypoint_arguments);

  FlView* view = fl_view_new(project);
  GdkRGBA background_color;
  // Background defaults to black, override it here if necessary, e.g. #00000000
  // for transparent.
  gdk_rgba_parse(&background_color, "#000000");
  fl_view_set_background_color(view, &background_color);
  gtk_widget_show(GTK_WIDGET(view));
  gtk_container_add(GTK_CONTAINER(window), GTK_WIDGET(view));

  // Show the window when Flutter renders.
  // Requires the view to be realized so we can start rendering.
  g_signal_connect_swapped(view, "first-frame", G_CALLBACK(first_frame_cb),
                           self);
  gtk_widget_realize(GTK_WIDGET(view));

  fl_register_plugins(FL_PLUGIN_REGISTRY(view));
  register_linux_overlay_channel(self, view);

  gtk_widget_grab_focus(GTK_WIDGET(view));
}

// Implements GApplication::local_command_line.
static gboolean my_application_local_command_line(GApplication* application,
                                                  gchar*** arguments,
                                                  int* exit_status) {
  MyApplication* self = MY_APPLICATION(application);
  // Strip out the first argument as it is the binary name.
  self->dart_entrypoint_arguments = g_strdupv(*arguments + 1);

  g_autoptr(GError) error = nullptr;
  if (!g_application_register(application, nullptr, &error)) {
    g_warning("Failed to register: %s", error->message);
    *exit_status = 1;
    return TRUE;
  }

  g_application_activate(application);
  *exit_status = 0;

  return TRUE;
}

// Implements GApplication::startup.
static void my_application_startup(GApplication* application) {
  // MyApplication* self = MY_APPLICATION(object);

  // Perform any actions required at application startup.

  G_APPLICATION_CLASS(my_application_parent_class)->startup(application);
}

// Implements GApplication::shutdown.
static void my_application_shutdown(GApplication* application) {
  // MyApplication* self = MY_APPLICATION(object);

  // Perform any actions required at application shutdown.

  G_APPLICATION_CLASS(my_application_parent_class)->shutdown(application);
}

// Implements GObject::dispose.
static void my_application_dispose(GObject* object) {
  MyApplication* self = MY_APPLICATION(object);
  g_clear_pointer(&self->dart_entrypoint_arguments, g_strfreev);
  g_clear_pointer(&self->last_error_code, g_free);
  g_clear_pointer(&self->last_error_message, g_free);
  if (self->overlay_events != nullptr) {
    g_ptr_array_unref(self->overlay_events);
    self->overlay_events = nullptr;
  }
  g_clear_object(&self->linux_overlay_channel);
  G_OBJECT_CLASS(my_application_parent_class)->dispose(object);
}

static void my_application_class_init(MyApplicationClass* klass) {
  G_APPLICATION_CLASS(klass)->activate = my_application_activate;
  G_APPLICATION_CLASS(klass)->local_command_line =
      my_application_local_command_line;
  G_APPLICATION_CLASS(klass)->startup = my_application_startup;
  G_APPLICATION_CLASS(klass)->shutdown = my_application_shutdown;
  G_OBJECT_CLASS(klass)->dispose = my_application_dispose;
}

static void my_application_init(MyApplication* self) {
  self->window = nullptr;
  self->linux_overlay_channel = nullptr;
  self->overlay_enabled = FALSE;
  self->overlay_visible = FALSE;
  self->hotkey_registered = FALSE;
  self->overlay_size_scale = 1.0;
  self->overlay_opacity = 0.9;
  self->last_error_code = nullptr;
  self->last_error_message = nullptr;
  self->overlay_events =
      g_ptr_array_new_with_free_func(reinterpret_cast<GDestroyNotify>(
          fl_value_unref));
}

MyApplication* my_application_new() {
  // Set the program name to the application ID, which helps various systems
  // like GTK and desktop environments map this running application to its
  // corresponding .desktop file. This ensures better integration by allowing
  // the application to be recognized beyond its binary name.
  g_set_prgname(APPLICATION_ID);

  return MY_APPLICATION(g_object_new(my_application_get_type(),
                                     "application-id", APPLICATION_ID, "flags",
                                     G_APPLICATION_NON_UNIQUE, nullptr));
}

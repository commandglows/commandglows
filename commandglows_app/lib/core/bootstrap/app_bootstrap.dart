import 'firebase_bootstrap.dart';

class AppBootstrap {
  static Future<void> init() async {
    await FirebaseBootstrap.init();
  }
}

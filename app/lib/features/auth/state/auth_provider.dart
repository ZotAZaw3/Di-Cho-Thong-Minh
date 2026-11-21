import 'package:flutter/foundation.dart';

import '../../../core/errors/api_exception.dart';
import '../data/auth_repository.dart';

enum AuthStatus { initializing, unauthenticated, authenticated, error }

class AuthProvider extends ChangeNotifier {
  AuthProvider({required AuthRepository repository}) : _repository = repository;

  final AuthRepository _repository;

  AuthStatus status = AuthStatus.initializing;
  bool isBusy = false;
  bool isDemoMode = false;
  String? errorMessage;
  Map<String, dynamic> user = const {};

  Future<void> restoreSession() async {
    isDemoMode = false;
    try {
      final token = await _repository.readToken();
      if (token == null || token.isEmpty) {
        status = AuthStatus.unauthenticated;
      } else {
        user = await _repository.currentUser();
        status = AuthStatus.authenticated;
      }
    } on ApiException catch (error) {
      if (error.code == '00281' || error.code == '00284') {
        await _repository.logout();
        status = AuthStatus.unauthenticated;
      } else {
        errorMessage = error.message;
        status = AuthStatus.error;
      }
    } catch (error) {
      errorMessage = 'Không thể khôi phục phiên đăng nhập: $error';
      status = AuthStatus.error;
    }
    notifyListeners();
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    isBusy = true;
    isDemoMode = false;
    errorMessage = null;
    notifyListeners();
    try {
      await _repository.login(email: email, password: password);
      user = await _repository.currentUser();
      status = AuthStatus.authenticated;
    } catch (error) {
      errorMessage = error is ApiException
          ? error.message
          : 'Đăng nhập không thành công: $error';
    } finally {
      isBusy = false;
      notifyListeners();
    }
  }

  void enterDemoMode({String name = 'Khách trải nghiệm'}) {
    isDemoMode = true;
    errorMessage = null;
    user = {'name': name};
    status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<void> logout() async {
    if (!isDemoMode) await _repository.logout();
    isDemoMode = false;
    user = const {};
    errorMessage = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  String get displayName {
    final name = (user['fullName'] ??
            user['name'] ??
            user['username'] ??
            user['email'] ??
            '')
        .toString()
        .trim();
    return name.isEmpty ? 'Bạn' : name;
  }
}

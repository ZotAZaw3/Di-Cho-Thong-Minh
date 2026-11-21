import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/theme/app_theme.dart';
import '../../features/auth/state/auth_provider.dart';
import '../../features/grocery/state/grocery_provider.dart';
import '../fridge/fridge_screen.dart';
import '../meals/meals_screen.dart';
import '../shopping/shopping_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _selectedIndex = 0;
  static const _titles = ['Tủ lạnh', 'Đi chợ', 'Bữa ăn & công thức'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final grocery = context.read<GroceryProvider>();
      if (context.read<AuthProvider>().isDemoMode) {
        grocery.loadDemoData();
      } else {
        grocery.loadAll();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    const pages = [FridgeScreen(), ShoppingScreen(), MealsScreen()];
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        titleSpacing: 20,
        title: Row(
          children: [
            const Icon(Icons.local_grocery_store_rounded,
                color: AppColors.green, size: 28),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Đi chợ thông minh',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                Text(
                  _titles[_selectedIndex],
                  style: const TextStyle(
                      color: AppColors.muted, fontSize: 11, height: 1.3),
                ),
              ],
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Tài khoản',
            onSelected: (value) async {
              if (value == 'logout') {
                try {
                  await context.read<AuthProvider>().logout();
                } catch (error) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Không thể đăng xuất an toàn: $error'),
                      ),
                    );
                  }
                }
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout_rounded, size: 19),
                    SizedBox(width: 10),
                    Text('Đăng xuất'),
                  ],
                ),
              ),
            ],
            child: Padding(
              padding: const EdgeInsets.only(left: 4, right: 18),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.greenLight,
                child: Text(
                  auth.displayName.substring(0, 1).toUpperCase(),
                  style: const TextStyle(
                      color: AppColors.green, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          if (auth.isDemoMode)
            Container(
              width: double.infinity,
              color: AppColors.yellowLight,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 9),
              child: const Row(
                children: [
                  Icon(Icons.visibility_outlined,
                      size: 16, color: AppColors.ink),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Chế độ xem thử · Dữ liệu mẫu, chưa đồng bộ với máy chủ',
                      style: TextStyle(color: AppColors.ink, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: IndexedStack(index: _selectedIndex, children: pages),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) =>
            setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.kitchen_outlined),
            selectedIcon: Icon(Icons.kitchen_rounded),
            label: 'Tủ lạnh',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_basket_outlined),
            selectedIcon: Icon(Icons.shopping_basket_rounded),
            label: 'Đi chợ',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_menu_rounded),
            selectedIcon: Icon(Icons.restaurant_rounded),
            label: 'Bữa ăn',
          ),
        ],
      ),
    );
  }
}

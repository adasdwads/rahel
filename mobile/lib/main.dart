import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'config/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/capsule_provider.dart';
import 'providers/charity_provider.dart';
import 'providers/heartbeat_provider.dart';
import 'providers/vault_provider.dart';
import 'providers/wallet_provider.dart';
import 'models/nav_item.dart';
import 'screens/auth/login_screen.dart';
import 'screens/charity_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/social_legacy_screen.dart';
import 'screens/time_capsule_screen.dart';
import 'screens/vault_screen.dart';
import 'utils/app_strings.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider()..restoreSession(),
      child: const RahelApp(),
    ),
  );
}

class RahelApp extends StatelessWidget {
  const RahelApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => VaultProvider()),
        ChangeNotifierProvider(create: (_) => CharityProvider()),
        ChangeNotifierProvider(create: (_) => CapsuleProvider()),
        ChangeNotifierProvider(create: (_) => HeartbeatProvider()),
        ChangeNotifierProvider(create: (_) => WalletProvider()),
      ],
      child: MaterialApp(
        title: AppStrings.appTitle,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        locale: const Locale('ar'),
        supportedLocales: const [
          Locale('ar'),
          Locale('en'),
        ],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: (context, child) {
          return Directionality(
            textDirection: TextDirection.rtl,
            child: child ?? const SizedBox.shrink(),
          );
        },
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        if (authProvider.isLoading) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        if (authProvider.isAuthenticated) {
          return const MainNavigationScreen();
        }

        return const LoginScreen();
      },
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class MainNavigationController extends InheritedWidget {
  const MainNavigationController({
    super.key,
    required this.goToTab,
    required super.child,
  });

  final void Function(int index) goToTab;

  static MainNavigationController? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<MainNavigationController>();
  }

  @override
  bool updateShouldNotify(MainNavigationController oldWidget) => false;
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    DashboardScreen(),
    VaultScreen(),
    CharityScreen(),
    TimeCapsuleScreen(),
    SocialLegacyScreen(),
  ];

  final List<NavItem> _items = const [
    NavItem(label: AppStrings.dashboard, icon: Icons.home_rounded),
    NavItem(label: AppStrings.vault, icon: Icons.lock_rounded),
    NavItem(label: AppStrings.charity, icon: Icons.favorite_rounded),
    NavItem(label: AppStrings.timeCapsule, icon: Icons.access_time_filled_rounded),
    NavItem(label: AppStrings.socialLegacy, icon: Icons.groups_rounded),
  ];

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MainNavigationController(
      goToTab: _onTabTapped,
      child: Scaffold(
        appBar: AppBar(
          title: Text(_items[_currentIndex].label),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout_rounded),
              onPressed: () => context.read<AuthProvider>().logout(),
            ),
          ],
        ),
        body: IndexedStack(
          index: _currentIndex,
          children: _screens,
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentIndex,
          type: BottomNavigationBarType.fixed,
          items: _items
              .map(
                (item) => BottomNavigationBarItem(
                  icon: Icon(item.icon),
                  label: item.label,
                ),
              )
              .toList(),
          onTap: _onTabTapped,
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

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

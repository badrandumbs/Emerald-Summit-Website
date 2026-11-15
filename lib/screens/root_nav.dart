import 'package:flutter/material.dart';

import '../app_navigation.dart';
import '../app_state.dart';
import '../widgets/floating_tab_bar.dart';
import '../widgets/scroll_aware_bottom_bar.dart';
import 'dashboard_screen.dart';
import 'schedule_screen.dart';
import 'discover_screen.dart';
import 'announcements_screen.dart';
import 'archie_screen.dart';
import 'notifications_screen.dart';

/// Bottom-tab shell hosting the five main sections of the app (Home ·
/// Schedule · Discover · News · Archie). Profile lives behind the avatar in
/// the [DashboardScreen] header (Uber-style), so it isn't a bottom-bar
/// destination.
///
/// The bar slides away while you scroll down a tab and comes back when you
/// scroll up (see [ScrollAwareBottomBar]). It stays put on Ask Archie, where
/// the message box sits right above it.
class RootNav extends StatefulWidget {
  const RootNav({super.key});

  @override
  State<RootNav> createState() => _RootNavState();
}

class _RootNavState extends State<RootNav>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  late final _bar = ScrollAwareBottomBarController(vsync: this);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    rootTab.addListener(_onTabChanged);
    // The in-app banner for a personal notice opens the bell's list.
    openNotifications = () {
      if (mounted) openNotificationsScreen(context);
    };
  }

  @override
  void dispose() {
    openNotifications = null;
    rootTab.removeListener(_onTabChanged);
    _bar.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  bool _screenReader = false;

  /// A new tab always opens with the bar showing.
  void _onTabChanged() {
    _bar
      // Screen-reader users get a bar that never moves out from under them.
      ..enabled = !_screenReader && rootTab.value != kArchieTabIndex
      ..show();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _bar.reduceMotion = MediaQuery.disableAnimationsOf(context);
    _screenReader = MediaQuery.accessibleNavigationOf(context);
    _onTabChanged();
  }

  /// Re-checks the summit status each time the app comes back to the
  /// foreground, so post-summit feedback (and the countdown, hours and My Day
  /// states that follow the summit date) catch up without a relaunch. The
  /// auth gate shows the feedback question as soon as it opens.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      appState.loadSummitStatus();
      appState.loadExpertRequests();
    }
  }

  static const _screens = [
    DashboardScreen(),
    ScheduleScreen(),
    DiscoverScreen(),
    AnnouncementsScreen(),
    ArchieScreen(),
  ];

  static const _tabs = [
    FloatingTab(
      icon: Icon(Icons.home_outlined),
      selectedIcon: Icon(Icons.home),
      label: 'Home',
    ),
    FloatingTab(
      icon: Icon(Icons.event_note_outlined),
      selectedIcon: Icon(Icons.event_note),
      label: 'Schedule',
    ),
    FloatingTab(
      icon: Icon(Icons.explore_outlined),
      selectedIcon: Icon(Icons.explore),
      label: 'Discover',
    ),
    // "News" so every label fits one line at the same size; the screen itself
    // is still titled Announcements. No count here: the bell on Home counts
    // new posts, so a post isn't counted twice.
    FloatingTab(
      icon: Icon(Icons.campaign_outlined),
      selectedIcon: Icon(Icons.campaign),
      label: 'News',
    ),
    FloatingTab(
      icon: ArchieNavIcon(selected: false),
      selectedIcon: ArchieNavIcon(selected: true),
      label: 'Ask Archie',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    // Driven by the global [rootTab] so code outside the widget tree (the in-app
    // banner) can switch tabs.
    return ValueListenableBuilder<int>(
      valueListenable: rootTab,
      builder: (context, index, _) => Scaffold(
        // The bar floats over the page, so pages scroll behind it. Each tab
        // pads its list's end by MediaQuery's bottom padding (the bar's
        // height) so the last item can scroll clear of it.
        extendBody: true,
        body: NotificationListener<ScrollNotification>(
          onNotification: _bar.handle,
          child: IndexedStack(index: index, children: _screens),
        ),
        bottomNavigationBar: ScrollAwareBottomBar(
          controller: _bar,
          child: Theme(
            // Archie's tab has its own backdrop; match the bar to it.
            data: index == kArchieTabIndex
                ? ArchieScreen.navBarTheme(Theme.of(context))
                : Theme.of(context),
            child: FloatingTabBar(
              tabs: _tabs,
              selectedIndex: index,
              onSelected: (i) => rootTab.value = i,
            ),
          ),
        ),
      ),
    );
  }
}

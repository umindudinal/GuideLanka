import 'dart:async';

import 'package:flutter/material.dart';

import 'package:flutter_map/flutter_map.dart';

import 'package:latlong2/latlong.dart';

import 'package:geolocator/geolocator.dart';

import '../services/api_service.dart';

import '../widgets/theme_constants.dart';

class SafariMapScreen extends StatefulWidget {
  const SafariMapScreen({super.key});

  @override
  State<SafariMapScreen> createState() => _SafariMapScreenState();
}

class _SafariMapScreenState extends State<SafariMapScreen> with SingleTickerProviderStateMixin {

  LatLng? _currentLocation;

  final MapController _mapController = MapController();

  bool _isOutOfZoneAlertSent = false;

  bool _isMapReady = false;

  List<dynamic> _recentSightings = [];

  Timer? _sightingsTimer;

  bool _isSatelliteView = false;

  String _selectedFilter = 'ALL';

  Map<String, dynamic>? _selectedSighting;

  AnimationController? _pulseController;
  Animation<double>? _pulseAnimation;

  @override
  void initState() {
    super.initState();

    _initPulseAnimation();

    _startLiveTracking();

    _fetchSightings();

    _sightingsTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      _fetchSightings();
    });
  }

  void _initPulseAnimation() {
    if (_pulseController == null) {
      _pulseController = AnimationController(
        vsync: this,
        duration: const Duration(seconds: 2),
      )..repeat(reverse: true);

      _pulseAnimation = Tween<double>(begin: 0.85, end: 1.25).animate(
        CurvedAnimation(parent: _pulseController!, curve: Curves.easeInOut),
      );
    }
  }

  @override
  void dispose() {
    _sightingsTimer?.cancel();
    _pulseController?.dispose();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _fetchSightings() async {
    final sightings = await ApiService.getRecentSightings();
    if (mounted) {
      setState(() {
        _recentSightings = sightings;
      });
    }
  }

  String _getAnimalEmoji(String animalType) {
    switch (animalType.toLowerCase()) {
      case 'elephant':
        return '🐘';
      case 'leopard':
        return '🐆';
      case 'bear':
        return '🐻';
      case 'deer':
        return '🦌';
      case 'peacock':
        return '🦚';
      default:
        return '🐾';
    }
  }

  Future<void> _startLiveTracking() async {

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return Future.error('Location services are disabled.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return Future.error('Location permissions are denied');
      }
    }

    Position position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
    if (mounted) {
      setState(() {
        _currentLocation = LatLng(position.latitude, position.longitude);
      });
    }

    ApiService.updateLiveLocation(position.latitude, position.longitude);

    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });

        if (_isMapReady) {
          _mapController.move(_currentLocation!, _mapController.camera.zoom);
        }

        ApiService.updateLiveLocation(position.latitude, position.longitude);

        _checkGeofenceBounds(position.latitude, position.longitude);
      }
    });
  }

  void _checkGeofenceBounds(double lat, double lng) {

    bool isOutside = (lat < 8.1200 || lat > 8.1500 || lng < 80.9500 || lng > 80.9800);

    if (isOutside && !_isOutOfZoneAlertSent) {
      _isOutOfZoneAlertSent = true;
      ApiService.sendEmergencyAlert('Route Deviation', lat, lng);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: Colors.white),
              SizedBox(width: 10),
              Expanded(
                child: Text('⚠️ WARNING: You have left authorized park zone! Emergency alert sent.'),
              ),
            ],
          ),
          backgroundColor: AppColors.offline,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: const Duration(seconds: 5),
        ),
      );
    }

    else if (!isOutside && _isOutOfZoneAlertSent) {
      _isOutOfZoneAlertSent = false;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.check_circle_rounded, color: Colors.white),
              SizedBox(width: 10),
              Text('✅ Back inside authorized park zone.'),
            ],
          ),
          backgroundColor: AppColors.online,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  double _calculateDistanceInKm(double lat1, double lon1, double lat2, double lon2) {
    double distanceInMeters = Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
    return distanceInMeters / 1000.0;
  }

  void _showSightingBottomSheet() {
    if (_currentLocation == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            boxShadow: [
              BoxShadow(color: Colors.black26, blurRadius: 20, spreadRadius: 5),
            ],
          ),
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: const BoxDecoration(
                      color: AppColors.primaryExtraLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.add_location_alt_rounded, color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Log Wildlife Spotting',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.textDark),
                      ),
                      Text(
                        'Broadcasting live to all safari guides in park',
                        style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),

              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 3,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.95,
                children: [
                  _buildAnimalButton('Elephant', '🐘'),
                  _buildAnimalButton('Leopard', '🐆'),
                  _buildAnimalButton('Bear', '🐻'),
                  _buildAnimalButton('Deer', '🦌'),
                  _buildAnimalButton('Peacock', '🦚'),
                  _buildAnimalButton('Other', '🐾'),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAnimalButton(String name, String emoji) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          Navigator.pop(context);
          _saveSighting(name);
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.bgSand,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.08)),
            boxShadow: AppShadows.softCardShadow,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 34)),
              const SizedBox(height: 6),
              Text(
                name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: AppColors.textDark,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _saveSighting(String animalName) async {
    final lat = _currentLocation!.latitude;
    final lng = _currentLocation!.longitude;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: const [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Publishing wildlife sighting...'),
          ],
        ),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );

    final result = await ApiService.logWildlifeSighting(animalName, lat, lng);

    if (!mounted) return;

    if (result['success']) {
      _fetchSightings();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('🎉 $animalName sighting logged live on map!'),
          backgroundColor: AppColors.online,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to save sighting: ${result['error']}'),
          backgroundColor: AppColors.offline,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  List<dynamic> get _filteredSightings {
    if (_selectedFilter == 'ALL') return _recentSightings;
    return _recentSightings.where((s) => (s['animal_type'] ?? '').toString().toLowerCase() == _selectedFilter.toLowerCase()).toList();
  }

  @override
  Widget build(BuildContext context) {
    _initPulseAnimation();
    return Scaffold(
      backgroundColor: AppColors.bgSand,

      body: _currentLocation == null
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: AppColors.primary),
                  SizedBox(height: 16),
                  Text(
                    'Initializing GPS & Park Radar...',
                    style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            )

          : Stack(
              children: [

                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _currentLocation ?? const LatLng(6.375, 81.518),
                    initialZoom: 15.0,
                    onMapReady: () {
                      setState(() {
                        _isMapReady = true;
                      });
                    },
                    onTap: (tapPosition, point) {

                      if (_selectedSighting != null) {
                        setState(() {
                          _selectedSighting = null;
                        });
                      }
                    },
                  ),
                  children: [

                    if (!_isSatelliteView)
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.guidelanka.driver',
                      )
                    else ...[

                      TileLayer(
                        urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        userAgentPackageName: 'com.guidelanka.driver',
                        maxZoom: 19,
                      ),

                      TileLayer(
                        urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
                        userAgentPackageName: 'com.guidelanka.driver',
                        maxZoom: 19,
                      ),

                      TileLayer(
                        urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
                        userAgentPackageName: 'com.guidelanka.driver',
                        maxZoom: 19,
                      ),
                    ],

                    PolygonLayer(
                      polygons: [
                        Polygon(
                          points: const [
                            LatLng(6.3000, 81.2000),
                            LatLng(6.4800, 81.2000),
                            LatLng(6.4800, 81.5500),
                            LatLng(6.3000, 81.5500),
                          ],
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderStrokeWidth: 3.0,
                          borderColor: AppColors.primary,
                        ),
                      ],
                    ),

                    MarkerLayer(
                      markers: [

                        Marker(
                          width: 60.0,
                          height: 60.0,
                          point: _currentLocation!,
                          child: ScaleTransition(
                            scale: _pulseAnimation!,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.blue.withValues(alpha: 0.25),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF2980B9), Color(0xFF3498DB)],
                                    ),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 3),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.blue.withValues(alpha: 0.4),
                                        blurRadius: 10,
                                        spreadRadius: 2,
                                      )
                                    ],
                                  ),
                                  child: const Icon(Icons.directions_car_rounded, color: Colors.white, size: 22),
                                ),
                              ),
                            ),
                          ),
                        ),

                        ..._filteredSightings.map((sighting) {
                          final lat = double.tryParse(sighting['location_lat'].toString()) ?? 0.0;
                          final lng = double.tryParse(sighting['location_lng'].toString()) ?? 0.0;
                          final animalType = sighting['animal_type'] ?? 'Unknown';
                          final isImportant = animalType.toLowerCase() == 'leopard' || animalType.toLowerCase() == 'elephant';
                          final isSelected = _selectedSighting != null && _selectedSighting!['id'] == sighting['id'];

                          return Marker(
                            width: 54.0,
                            height: 54.0,
                            point: LatLng(lat, lng),
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedSighting = sighting;
                                });

                                _mapController.move(LatLng(lat, lng), 16.0);
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppColors.accentLight : Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isSelected
                                        ? AppColors.accent
                                        : (isImportant ? AppColors.accent : AppColors.primary),
                                    width: isSelected ? 3.5 : 2.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: (isImportant ? AppColors.accent : AppColors.primary).withValues(alpha: 0.35),
                                      blurRadius: isSelected ? 14 : 8,
                                      spreadRadius: isSelected ? 3 : 1,
                                    )
                                  ],
                                ),
                                child: Center(
                                  child: Text(
                                    _getAnimalEmoji(animalType),
                                    style: TextStyle(fontSize: isSelected ? 28 : 24),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  ],
                ),

                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.only(top: 10, left: 16, right: 16, bottom: 14),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.primary.withValues(alpha: 0.95),
                          AppColors.primary.withValues(alpha: 0.85),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.explore_rounded, color: AppColors.accent, size: 20),
                                  ),
                                  const SizedBox(width: 10),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Live Safari Radar',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 17,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                                      Row(
                                        children: [
                                          Container(
                                            width: 7,
                                            height: 7,
                                            decoration: const BoxDecoration(
                                              color: AppColors.online,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 5),
                                          Text(
                                            _isOutOfZoneAlertSent ? 'OUT OF ZONE ⚠️' : 'Medirigiriya Park Zone 🌲',
                                            style: TextStyle(
                                              color: _isOutOfZoneAlertSent ? Colors.red.shade200 : Colors.white70,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),

                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.radar_rounded, color: AppColors.accent, size: 14),
                                    const SizedBox(width: 5),
                                    Text(
                                      '${_recentSightings.length} Spotted',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildFilterChip('ALL', '🐾 All (${_recentSightings.length})'),
                                _buildFilterChip('Elephant', '🐘 Elephants'),
                                _buildFilterChip('Leopard', '🐆 Leopards'),
                                _buildFilterChip('Bear', '🐻 Bears'),
                                _buildFilterChip('Deer', '🦌 Deer'),
                                _buildFilterChip('Peacock', '🦚 Peacocks'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                Positioned(
                  top: 145.0,
                  right: 16.0,
                  child: Column(
                    children: [

                      _buildMapControlButton(
                        icon: _isSatelliteView ? Icons.map_rounded : Icons.satellite_alt_rounded,
                        tooltip: _isSatelliteView ? 'Standard View' : 'Satellite HD',
                        isActive: _isSatelliteView,
                        onPressed: () {
                          setState(() {
                            _isSatelliteView = !_isSatelliteView;
                          });
                        },
                      ),
                      const SizedBox(height: 8),

                      _buildMapControlButton(
                        icon: Icons.explore_rounded,
                        tooltip: 'Align North',
                        isActive: false,
                        onPressed: () {
                          if (_isMapReady) {
                            _mapController.rotate(0.0);
                          }
                        },
                      ),
                      const SizedBox(height: 8),

                      _buildMapControlButton(
                        icon: Icons.add_rounded,
                        tooltip: 'Zoom In',
                        isActive: false,
                        onPressed: () {
                          if (_isMapReady) {
                            _mapController.move(
                              _mapController.camera.center,
                              _mapController.camera.zoom + 1.0,
                            );
                          }
                        },
                      ),
                      const SizedBox(height: 8),

                      _buildMapControlButton(
                        icon: Icons.remove_rounded,
                        tooltip: 'Zoom Out',
                        isActive: false,
                        onPressed: () {
                          if (_isMapReady) {
                            _mapController.move(
                              _mapController.camera.center,
                              _mapController.camera.zoom - 1.0,
                            );
                          }
                        },
                      ),
                      const SizedBox(height: 8),

                      _buildMapControlButton(
                        icon: Icons.my_location_rounded,
                        tooltip: 'My Location',
                        isActive: true,
                        activeColor: Colors.blue.shade700,
                        onPressed: () {
                          if (_isMapReady && _currentLocation != null) {
                            _mapController.move(_currentLocation!, 15.5);
                          }
                        },
                      ),
                    ],
                  ),
                ),

                if (_selectedSighting != null && _currentLocation != null)
                  Positioned(
                    bottom: 90,
                    left: 20,
                    right: 20,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: AppShadows.softCardShadow,
                        border: Border.all(color: AppColors.accent.withValues(alpha: 0.3), width: 1.5),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: const BoxDecoration(
                              color: AppColors.accentLight,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              _getAnimalEmoji(_selectedSighting!['animal_type'] ?? ''),
                              style: const TextStyle(fontSize: 32),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '${_selectedSighting!['animal_type'] ?? 'Animal'} Sighting',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: AppColors.textDark,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.near_me_rounded, size: 13, color: AppColors.primary),
                                    const SizedBox(width: 4),

                                    Text(
                                      '${_calculateDistanceInKm(_currentLocation!.latitude, _currentLocation!.longitude, double.tryParse(_selectedSighting!['location_lat'].toString()) ?? 0.0, double.tryParse(_selectedSighting!['location_lng'].toString()) ?? 0.0).toStringAsFixed(1)} km from your position',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textMuted,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          IconButton(
                            icon: const Icon(Icons.close_rounded, color: AppColors.textLight),
                            onPressed: () {
                              setState(() {
                                _selectedSighting = null;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                Positioned(
                  bottom: 24,
                  left: 30,
                  right: 30,
                  child: Container(
                    height: 54,
                    decoration: BoxDecoration(
                      gradient: AppGradients.primaryGradient,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.35),
                          blurRadius: 18,
                          spreadRadius: 2,
                          offset: const Offset(0, 6),
                        )
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _showSightingBottomSheet,
                        borderRadius: BorderRadius.circular(30),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.add_location_alt_rounded, color: AppColors.accent, size: 22),
                            SizedBox(width: 10),
                            Text(
                              'LOG WILDLIFE SIGHTING',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    bool isSelected = _selectedFilter == filterKey;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = filterKey;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accent : Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.accent : Colors.white.withValues(alpha: 0.25),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppColors.textDark : Colors.white,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildMapControlButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
    bool isActive = false,
    Color? activeColor,
  }) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: isActive ? (activeColor ?? AppColors.primary) : Colors.white,
        shape: BoxShape.circle,
        boxShadow: AppShadows.softCardShadow,
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          customBorder: const CircleBorder(),
          child: Tooltip(
            message: tooltip,
            child: Icon(
              icon,
              color: isActive ? Colors.white : AppColors.primary,
              size: 22,
            ),
          ),
        ),
      ),
    );
  }
}

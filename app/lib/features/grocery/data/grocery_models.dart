class FoodItem {
  const FoodItem({
    required this.id,
    required this.name,
    this.category = '',
    this.unit = '',
  });

  final String id;
  final String name;
  final String category;
  final String unit;

  factory FoodItem.fromJson(Map<String, dynamic> json) {
    return FoodItem(
      id: _string(json['id'] ?? json['foodId'] ?? json['food_id']),
      name: _string(json['foodName'] ?? json['name'] ?? json['food_name']),
      category: _optionName(json['categoryName'] ?? json['category']),
      unit: _optionName(json['unitName'] ?? json['unit']),
    );
  }
}

class FoodCatalog {
  const FoodCatalog({
    required this.foods,
    required this.categories,
    required this.units,
  });

  final List<FoodItem> foods;
  final List<String> categories;
  final List<String> units;

  factory FoodCatalog.fromData(dynamic data) {
    final map = _map(data);
    final rawFoods = map['foods'] ??
        map['foodItems'] ??
        map['foodList'] ??
        map['foodCatalog'] ??
        map['food'] ??
        map['items'] ??
        map['results'] ??
        data;
    return FoodCatalog(
      foods: _records(rawFoods)
          .map(FoodItem.fromJson)
          .where((food) => food.name.isNotEmpty)
          .toList(),
      categories: _optionList(
        map['categories'] ??
            map['foodCategories'] ??
            map['commonCategories'] ??
            map['categoryList'],
      ),
      units: _optionList(
        map['units'] ?? map['measurementUnits'] ?? map['commonUnits'] ?? map['unitList'],
      ),
    );
  }
}

class FridgeItem {
  const FridgeItem({
    required this.id,
    required this.name,
    required this.quantity,
    required this.location,
    this.expiryDate,
    this.unit = '',
  });

  final String id;
  final String name;
  final String quantity;
  final String location;
  final DateTime? expiryDate;
  final String unit;

  bool get isExpired {
    if (expiryDate == null) return false;
    return _dateOnly(expiryDate!).isBefore(_dateOnly(DateTime.now()));
  }

  bool get expiresSoon {
    if (expiryDate == null || isExpired) return false;
    final daysUntilExpiry =
        _dateOnly(expiryDate!).difference(_dateOnly(DateTime.now())).inDays;
    return daysUntilExpiry <= 3;
  }

  factory FridgeItem.fromJson(Map<String, dynamic> json) {
    final food = _map(json['food']);
    return FridgeItem(
      id: _string(json['id'] ?? json['fridgeId'] ?? json['foodId']),
      name: _string(
        json['foodName'] ?? json['name'] ?? food['name'] ?? food['foodName'],
        fallback: 'Thực phẩm',
      ),
      quantity: _string(json['quantity'] ?? json['amount'], fallback: '0'),
      location: _string(
        json['storageLocation'] ?? json['location'] ?? json['place'],
        fallback: 'Chưa phân loại',
      ),
      expiryDate: _dateTime(
        json['expiryDate'] ?? json['expirationDate'] ?? json['expiry'],
      ),
      unit: _optionName(json['unitName'] ?? json['unit']),
    );
  }
}

class ShoppingTask {
  const ShoppingTask({
    required this.id,
    required this.name,
    required this.quantity,
    this.completed = false,
  });

  final String id;
  final String name;
  final String quantity;
  final bool completed;

  factory ShoppingTask.fromJson(Map<String, dynamic> json) {
    return ShoppingTask(
      id: _string(json['id'] ?? json['taskId']),
      name: _string(json['foodName'] ?? json['name'], fallback: 'Mặt hàng'),
      quantity: _string(json['quantity'], fallback: '1'),
      completed: json['completed'] == true ||
          json['isCompleted'] == true ||
          json['isDone'] == true,
    );
  }
}

class ShoppingList {
  const ShoppingList({
    required this.id,
    required this.name,
    this.assignedTo = '',
    this.tasks = const [],
  });

  final String id;
  final String name;
  final String assignedTo;
  final List<ShoppingTask> tasks;

  factory ShoppingList.fromJson(Map<String, dynamic> json) {
    return ShoppingList(
      id: _string(json['id'] ?? json['listId'] ?? json['list_id']),
      name: _string(json['name'] ?? json['listName'],
          fallback: 'Danh sách đi chợ'),
      assignedTo: _string(json['assignedTo'] ?? json['assignee']),
      tasks: _records(json['tasks']).map(ShoppingTask.fromJson).toList(),
    );
  }
}

class MealPlan {
  const MealPlan({
    required this.id,
    required this.title,
    required this.dateLabel,
    this.mealType = '',
  });

  final String id;
  final String title;
  final String dateLabel;
  final String mealType;

  factory MealPlan.fromJson(Map<String, dynamic> json) {
    return MealPlan(
      id: _string(json['id'] ?? json['mealId'] ?? json['meal_id']),
      title: _string(
        json['mealName'] ?? json['title'] ?? json['name'],
        fallback: 'Bữa ăn',
      ),
      dateLabel: _string(
        json['date'] ?? json['mealDate'] ?? json['scheduledAt'],
        fallback: 'Chưa có ngày',
      ),
      mealType: _string(json['mealType'] ?? json['type']),
    );
  }
}

class Recipe {
  const Recipe({
    required this.id,
    required this.name,
    this.description = '',
    this.duration = '',
  });

  final String id;
  final String name;
  final String description;
  final String duration;

  factory Recipe.fromJson(Map<String, dynamic> json) {
    return Recipe(
      id: _string(json['id'] ?? json['recipeId'] ?? json['recipe_id']),
      name: _string(json['name'] ?? json['recipeName'],
          fallback: 'Công thức'),
      description: _string(json['description'] ?? json['summary']),
      duration: _string(json['duration'] ?? json['cookingTime']),
    );
  }
}

Map<String, dynamic> jsonMap(dynamic value) => _map(value);

List<Map<String, dynamic>> jsonRecords(dynamic value,
        {List<String> keys = const []}) =>
    _records(value, keys: keys);

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

List<Map<String, dynamic>> _records(
  dynamic value, {
  List<String> keys = const [],
}) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((record) => Map<String, dynamic>.from(record))
        .toList();
  }
  final map = _map(value);
  for (final key in keys) {
    if (map[key] is List) return _records(map[key]);
  }
  for (final key in const ['results', 'items', 'data', 'records']) {
    if (map[key] is List) return _records(map[key]);
  }
  return const [];
}

String _string(dynamic value, {String fallback = ''}) {
  if (value == null || value.toString().isEmpty) return fallback;
  return value.toString();
}

String _optionName(dynamic value) {
  if (value is Map) {
    return _string(
      value['name'] ?? value['categoryName'] ?? value['unitName'] ?? value['label'],
    );
  }
  return _string(value);
}

List<String> _optionList(dynamic value) {
  if (value is! List) return const [];
  return value
      .map(_optionName)
      .where((option) => option.isNotEmpty)
      .toList();
}

DateTime? _dateTime(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

DateTime _dateOnly(DateTime value) =>
    DateTime(value.year, value.month, value.day);

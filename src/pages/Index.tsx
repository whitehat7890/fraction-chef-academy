
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Recipe {
  id: string;
  name: string;
  baseServing: number;
  ingredients: { [key: string]: number };
  cookingTime: number;
  difficulty: number;
}

interface Order {
  id: string;
  recipe: Recipe;
  requestedServing: number;
  patience: number;
  maxPatience: number;
  customerName: string;
  status: 'waiting' | 'preparing' | 'cooking' | 'ready' | 'served';
  calculatedIngredients?: { [key: string]: number };
  cookingProgress?: number;
}

interface Inventory {
  [key: string]: number;
}

const RECIPES: Recipe[] = [
  {
    id: 'pancakes',
    name: 'Fluffy Pancakes',
    baseServing: 4,
    ingredients: { flour: 2, milk: 1.5, eggs: 2, sugar: 0.5 },
    cookingTime: 3000,
    difficulty: 1
  },
  {
    id: 'cookies',
    name: 'Chocolate Cookies',
    baseServing: 6,
    ingredients: { flour: 3, butter: 1, sugar: 1.5, chocolate: 0.75 },
    cookingTime: 4000,
    difficulty: 2
  },
  {
    id: 'soup',
    name: 'Vegetable Soup',
    baseServing: 8,
    ingredients: { broth: 4, vegetables: 2, herbs: 0.25, salt: 0.125 },
    cookingTime: 5000,
    difficulty: 3
  }
];

const CUSTOMER_NAMES = ['Alex', 'Sarah', 'Mike', 'Emma', 'Jake', 'Lisa', 'Tom', 'Maya', 'Ben', 'Zoe'];

const Index = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [currentStation, setCurrentStation] = useState<'prep' | 'stove' | 'oven' | 'plating' | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [ordersCompleted, setOrdersCompleted] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});
  
  const [inventory, setInventory] = useState<Inventory>({
    flour: 20,
    milk: 15,
    eggs: 24,
    sugar: 10,
    butter: 8,
    chocolate: 6,
    broth: 12,
    vegetables: 18,
    herbs: 4,
    salt: 2
  });

  const getRandomRecipe = useCallback(() => {
    const availableRecipes = RECIPES.filter(recipe => recipe.difficulty <= level);
    return availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
  }, [level]);

  const generateOrder = useCallback(() => {
    const recipe = getRandomRecipe();
    const servingOptions = [2, 3, 6, 8, 9, 12];
    const requestedServing = servingOptions[Math.floor(Math.random() * servingOptions.length)];
    const basePatience = Math.max(8000 - (level * 1000), 4000);
    
    return {
      id: `order-${Date.now()}-${Math.random()}`,
      recipe,
      requestedServing,
      patience: basePatience,
      maxPatience: basePatience,
      customerName: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
      status: 'waiting' as const
    };
  }, [getRandomRecipe, level]);

  const addNewOrder = useCallback(() => {
    if (orders.length < 15 && !gameCompleted) {
      setOrders(prev => [...prev, generateOrder()]);
    }
  }, [orders.length, gameCompleted, generateOrder]);

  useEffect(() => {
    if (!gameStarted || gameCompleted) return;

    const interval = setInterval(() => {
      addNewOrder();
    }, Math.max(8000 - (level * 500), 3000));

    return () => clearInterval(interval);
  }, [gameStarted, gameCompleted, addNewOrder, level]);

  useEffect(() => {
    if (!gameStarted || gameCompleted) return;

    const interval = setInterval(() => {
      setOrders(prev => prev.map(order => {
        if (order.status === 'waiting' || order.status === 'preparing') {
          const newPatience = order.patience - 100;
          if (newPatience <= 0) {
            toast.error(`${order.customerName} left disappointed!`);
            return null;
          }
          return { ...order, patience: newPatience };
        }
        if (order.status === 'cooking' && order.cookingProgress !== undefined) {
          const newProgress = order.cookingProgress + (100 / (order.recipe.cookingTime / 100));
          if (newProgress >= 100) {
            toast.success(`${order.recipe.name} is ready for plating!`);
            return { ...order, status: 'ready', cookingProgress: 100 };
          }
          return { ...order, cookingProgress: newProgress };
        }
        return order;
      }).filter(Boolean) as Order[]);
    }, 100);

    return () => clearInterval(interval);
  }, [gameStarted, gameCompleted]);

  useEffect(() => {
    if (ordersCompleted > 0 && ordersCompleted % 3 === 0) {
      setLevel(prev => prev + 1);
      toast.success(`Level ${level + 1} unlocked! Customers are getting more impatient!`);
    }
  }, [ordersCompleted, level]);

  useEffect(() => {
    if (ordersCompleted >= 15) {
      setGameCompleted(true);
      toast.success(`Congratulations! You've completed Fraction Chef with ${score} points!`);
    }
  }, [ordersCompleted, score]);

  const startGame = () => {
    setGameStarted(true);
    setOrders([generateOrder()]);
  };

  const selectOrder = (order: Order) => {
    if (order.status === 'waiting') {
      setActiveOrder(order);
      setCurrentStation('prep');
      setOrders(prev => prev.map(o => 
        o.id === order.id ? { ...o, status: 'preparing' } : o
      ));
    }
  };

  const calculateFractions = (recipe: Recipe, requestedServing: number) => {
    const multiplier = requestedServing / recipe.baseServing;
    const calculated: { [key: string]: number } = {};
    
    Object.entries(recipe.ingredients).forEach(([ingredient, amount]) => {
      calculated[ingredient] = amount * multiplier;
    });
    
    return calculated;
  };

  const handleIngredientInput = (ingredient: string, value: string) => {
    setInputValues(prev => ({ ...prev, [ingredient]: value }));
  };

  const validateIngredients = () => {
    if (!activeOrder) return false;
    
    const calculated = calculateFractions(activeOrder.recipe, activeOrder.requestedServing);
    const tolerance = 0.1;
    
    for (const [ingredient, expectedAmount] of Object.entries(calculated)) {
      const inputValue = parseFloat(inputValues[ingredient] || '0');
      if (Math.abs(inputValue - expectedAmount) > tolerance) {
        toast.error(`${ingredient} amount is incorrect. Expected: ${expectedAmount.toFixed(2)}`);
        return false;
      }
      
      if (inventory[ingredient] < inputValue) {
        toast.error(`Not enough ${ingredient} in inventory!`);
        return false;
      }
    }
    
    return true;
  };

  const moveToStove = () => {
    if (!validateIngredients() || !activeOrder) return;
    
    const calculated = calculateFractions(activeOrder.recipe, activeOrder.requestedServing);
    
    // Update inventory
    const newInventory = { ...inventory };
    Object.entries(calculated).forEach(([ingredient, amount]) => {
      newInventory[ingredient] -= amount;
    });
    setInventory(newInventory);
    
    setActiveOrder(prev => prev ? { 
      ...prev, 
      calculatedIngredients: calculated,
      status: 'cooking',
      cookingProgress: 0
    } : null);
    setCurrentStation('stove');
    toast.success('Ingredients prepared! Now cooking...');
  };

  const moveToPlating = () => {
    if (!activeOrder || activeOrder.status !== 'ready') return;
    setCurrentStation('plating');
  };

  const completeOrder = () => {
    if (!activeOrder || currentStation !== 'plating') return;
    
    const timeBonus = Math.floor(activeOrder.patience / 100);
    const basePoints = activeOrder.recipe.difficulty * 100;
    const totalPoints = basePoints + timeBonus;
    
    setScore(prev => prev + totalPoints);
    setOrdersCompleted(prev => prev + 1);
    setOrders(prev => prev.filter(o => o.id !== activeOrder.id));
    setActiveOrder(null);
    setCurrentStation(null);
    setInputValues({});
    
    toast.success(`Order completed! +${totalPoints} points`);
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-red-100 flex items-center justify-center p-4">
        <Card className="p-8 max-w-2xl mx-auto text-center shadow-2xl bg-white/90 backdrop-blur-sm">
          <div className="mb-6">
            <h1 className="text-5xl font-bold text-orange-600 mb-4">🍳 Fraction Chef</h1>
            <p className="text-xl text-gray-700 mb-6">Master fractions while managing your restaurant!</p>
          </div>
          
          <div className="space-y-4 text-left mb-8">
            <h3 className="text-2xl font-semibold text-gray-800">How to Play:</h3>
            <div className="bg-orange-50 p-4 rounded-lg space-y-2">
              <p><strong>1. Prep Station:</strong> Calculate ingredient amounts using fractions</p>
              <p><strong>2. Stove/Oven:</strong> Cook your prepared ingredients</p>
              <p><strong>3. Plating:</strong> Complete and serve the order</p>
              <p><strong>4. Goal:</strong> Serve 15 customers to win the game!</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p><strong>💡 Tip:</strong> Every 3 completed orders increases the difficulty level!</p>
            </div>
          </div>
          
          <Button 
            onClick={startGame}
            size="lg"
            className="text-xl px-8 py-4 bg-orange-500 hover:bg-orange-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Start Cooking! 👨‍🍳
          </Button>
        </Card>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 flex items-center justify-center p-4">
        <Card className="p-8 max-w-2xl mx-auto text-center shadow-2xl bg-white/90 backdrop-blur-sm">
          <h1 className="text-5xl font-bold text-green-600 mb-4">🎉 Congratulations!</h1>
          <h2 className="text-3xl font-semibold text-gray-800 mb-6">You've mastered Fraction Chef!</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{score}</p>
              <p className="text-gray-700">Total Score</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{level}</p>
              <p className="text-gray-700">Level Reached</p>
            </div>
          </div>
          
          <Button 
            onClick={() => window.location.reload()}
            size="lg"
            className="text-xl px-8 py-4 bg-green-500 hover:bg-green-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Play Again! 🔄
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-6">
            <h1 className="text-3xl font-bold text-orange-600">🍳 Fraction Chef</h1>
            <Badge variant="outline" className="text-lg px-3 py-1">Level {level}</Badge>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-xl font-semibold text-gray-700">Score: {score}</div>
            <div className="text-lg text-gray-600">Orders: {ordersCompleted}/15</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Kitchen Stations */}
          <div className="col-span-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Prep Station */}
              <Card className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                currentStation === 'prep' ? 'ring-4 ring-blue-400 shadow-xl bg-blue-50' : 'shadow-lg hover:shadow-xl'
              }`}>
                <div className="text-center">
                  <div className="text-4xl mb-2">🥄</div>
                  <h3 className="text-xl font-bold text-gray-800">Prep Station</h3>
                  <p className="text-sm text-gray-600">Calculate fractions</p>
                </div>
              </Card>

              {/* Stove */}
              <Card className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                currentStation === 'stove' ? 'ring-4 ring-red-400 shadow-xl bg-red-50' : 'shadow-lg hover:shadow-xl'
              }`}>
                <div className="text-center">
                  <div className="text-4xl mb-2">🔥</div>
                  <h3 className="text-xl font-bold text-gray-800">Stove</h3>
                  <p className="text-sm text-gray-600">Cook ingredients</p>
                  {activeOrder?.status === 'cooking' && (
                    <Progress value={activeOrder.cookingProgress || 0} className="mt-2" />
                  )}
                </div>
              </Card>

              {/* Oven */}
              <Card className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                currentStation === 'oven' ? 'ring-4 ring-orange-400 shadow-xl bg-orange-50' : 'shadow-lg hover:shadow-xl'
              }`}>
                <div className="text-center">
                  <div className="text-4xl mb-2">🔥</div>
                  <h3 className="text-xl font-bold text-gray-800">Oven</h3>
                  <p className="text-sm text-gray-600">Bake items</p>
                </div>
              </Card>

              {/* Plating */}
              <Card className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                currentStation === 'plating' ? 'ring-4 ring-green-400 shadow-xl bg-green-50' : 'shadow-lg hover:shadow-xl'
              }`}>
                <div className="text-center">
                  <div className="text-4xl mb-2">🍽️</div>
                  <h3 className="text-xl font-bold text-gray-800">Plating</h3>
                  <p className="text-sm text-gray-600">Serve dishes</p>
                </div>
              </Card>
            </div>

            {/* Active Order Workspace */}
            {activeOrder && currentStation === 'prep' && (
              <Card className="p-6 shadow-xl bg-white/90 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-4">🧮 Fraction Calculation</h3>
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-lg"><strong>Recipe:</strong> {activeOrder.recipe.name}</p>
                  <p><strong>Original serving:</strong> {activeOrder.recipe.baseServing} people</p>
                  <p><strong>Requested serving:</strong> {activeOrder.requestedServing} people</p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Multiplier:</strong> {activeOrder.requestedServing}/{activeOrder.recipe.baseServing} = {(activeOrder.requestedServing / activeOrder.recipe.baseServing).toFixed(2)}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {Object.entries(activeOrder.recipe.ingredients).map(([ingredient, amount]) => {
                    const calculatedAmount = (amount * activeOrder.requestedServing) / activeOrder.recipe.baseServing;
                    return (
                      <div key={ingredient} className="bg-white p-4 rounded-lg border">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Original: {amount} × {(activeOrder.requestedServing / activeOrder.recipe.baseServing).toFixed(2)} = {calculatedAmount.toFixed(2)}
                        </p>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter amount"
                          value={inputValues[ingredient] || ''}
                          onChange={(e) => handleIngredientInput(ingredient, e.target.value)}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">Available: {inventory[ingredient]}</p>
                      </div>
                    );
                  })}
                </div>
                
                <Button 
                  onClick={moveToStove}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg"
                >
                  Move to Stove 🔥
                </Button>
              </Card>
            )}

            {/* Cooking Station */}
            {activeOrder && (currentStation === 'stove' || currentStation === 'oven') && (
              <Card className="p-6 shadow-xl bg-white/90 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-4">🔥 Cooking {activeOrder.recipe.name}</h3>
                <div className="text-center">
                  <div className="text-6xl mb-4">
                    {activeOrder.status === 'cooking' ? '🔥' : '✅'}
                  </div>
                  <Progress value={activeOrder.cookingProgress || 0} className="mb-4" />
                  <p className="text-lg text-gray-700 mb-4">
                    {activeOrder.status === 'cooking' ? 'Cooking in progress...' : 'Ready for plating!'}
                  </p>
                  {activeOrder.status === 'ready' && (
                    <Button 
                      onClick={moveToPlating}
                      className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 text-lg"
                    >
                      Move to Plating 🍽️
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Plating Station */}
            {activeOrder && currentStation === 'plating' && (
              <Card className="p-6 shadow-xl bg-white/90 backdrop-blur-sm">
                <h3 className="text-2xl font-bold mb-4">🍽️ Plating {activeOrder.recipe.name}</h3>
                <div className="text-center">
                  <div className="text-6xl mb-4">🍽️</div>
                  <p className="text-lg text-gray-700 mb-6">
                    Serve {activeOrder.requestedServing} portions to {activeOrder.customerName}
                  </p>
                  <Button 
                    onClick={completeOrder}
                    className="bg-green-500 hover:bg-green-600 text-white py-3 px-8 text-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Serve Order! ✨
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-4">
            {/* Inventory */}
            <Card className="p-4 shadow-lg bg-white/90 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-3 text-gray-800">📦 Inventory</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(inventory).map(([ingredient, amount]) => (
                  <div key={ingredient} className="flex justify-between items-center py-1">
                    <span className="text-sm capitalize">{ingredient}</span>
                    <Badge variant={amount < 3 ? "destructive" : "outline"}>
                      {amount.toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Orders Queue */}
            <Card className="p-4 shadow-lg bg-white/90 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-3 text-gray-800">📋 Orders ({orders.length}/15)</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {orders.map((order) => (
                  <Card 
                    key={order.id}
                    className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      activeOrder?.id === order.id ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                    } ${order.status === 'waiting' ? 'hover:bg-gray-50' : ''}`}
                    onClick={() => selectOrder(order)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{order.customerName}</p>
                        <p className="text-xs text-gray-600">{order.recipe.name}</p>
                        <p className="text-xs text-gray-500">For {order.requestedServing} people</p>
                      </div>
                      <Badge 
                        variant={
                          order.status === 'waiting' ? 'outline' :
                          order.status === 'preparing' ? 'default' :
                          order.status === 'cooking' ? 'secondary' :
                          order.status === 'ready' ? 'destructive' : 'outline'
                        }
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <Progress 
                      value={(order.patience / order.maxPatience) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Patience: {Math.ceil(order.patience / 1000)}s
                    </p>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

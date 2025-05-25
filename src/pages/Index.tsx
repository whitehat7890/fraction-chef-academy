
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info } from 'lucide-react';
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
    const basePatience = 40000; // Changed to 40 seconds (40000ms)
    
    return {
      id: `order-${Date.now()}-${Math.random()}`,
      recipe,
      requestedServing,
      patience: basePatience,
      maxPatience: basePatience,
      customerName: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
      status: 'waiting' as const
    };
  }, [getRandomRecipe]);

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
          const newPatience = order.patience - 50;
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
        <Card className="p-12 max-w-4xl mx-auto text-center shadow-2xl bg-white/95 backdrop-blur-md border-4 border-orange-300 rounded-3xl transform hover:scale-105 transition-all duration-500">
          <div className="mb-8">
            <h1 className="text-8xl font-bold bg-gradient-to-r from-orange-600 via-red-500 to-pink-600 bg-clip-text text-transparent mb-6 animate-bounce drop-shadow-2xl">
              🍳 Fraction Chef
            </h1>
            <p className="text-2xl text-gray-700 mb-8 font-semibold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
              Master fractions while managing your restaurant!
            </p>
          </div>
          
          <div className="space-y-6 text-left mb-10 bg-gradient-to-br from-orange-50 to-yellow-50 p-8 rounded-2xl border-2 border-orange-200 shadow-inner">
            <h3 className="text-3xl font-bold text-center bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-6">
              🎮 How to Play
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 p-6 rounded-xl border-2 border-orange-200 shadow-lg transform hover:scale-105 transition-all duration-300">
                <p className="flex items-center text-lg font-semibold mb-2">
                  <span className="text-3xl mr-3 animate-pulse">🥄</span> 
                  <strong className="text-orange-700">Prep Station:</strong>
                </p>
                <p className="text-gray-700 ml-12">Calculate ingredient amounts using fractions</p>
              </div>
              <div className="bg-white/80 p-6 rounded-xl border-2 border-red-200 shadow-lg transform hover:scale-105 transition-all duration-300">
                <p className="flex items-center text-lg font-semibold mb-2">
                  <span className="text-3xl mr-3 animate-pulse">🔥</span> 
                  <strong className="text-red-700">Stove/Oven:</strong>
                </p>
                <p className="text-gray-700 ml-12">Cook your prepared ingredients</p>
              </div>
              <div className="bg-white/80 p-6 rounded-xl border-2 border-green-200 shadow-lg transform hover:scale-105 transition-all duration-300">
                <p className="flex items-center text-lg font-semibold mb-2">
                  <span className="text-3xl mr-3 animate-bounce">🍽️</span> 
                  <strong className="text-green-700">Plating:</strong>
                </p>
                <p className="text-gray-700 ml-12">Complete and serve the order</p>
              </div>
              <div className="bg-white/80 p-6 rounded-xl border-2 border-blue-200 shadow-lg transform hover:scale-105 transition-all duration-300">
                <p className="flex items-center text-lg font-semibold mb-2">
                  <span className="text-3xl mr-3 animate-spin">🎯</span> 
                  <strong className="text-blue-700">Goal:</strong>
                </p>
                <p className="text-gray-700 ml-12">Serve 15 customers to win!</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-xl border-2 border-yellow-300 mt-6">
              <p className="text-center text-lg">
                <strong className="text-yellow-800">💡 Pro Tip:</strong> 
                <span className="text-yellow-700"> Every 3 completed orders increases difficulty! Use keyboard for precise fraction input.</span>
              </p>
            </div>
          </div>
          
          <Button 
            onClick={startGame}
            size="lg"
            className="text-2xl px-12 py-6 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 transform hover:scale-110 transition-all duration-500 shadow-2xl animate-pulse rounded-2xl border-4 border-white font-bold text-white"
          >
            🚀 Start Cooking Adventure! 👨‍🍳
          </Button>
        </Card>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 flex items-center justify-center p-4">
        <Card className="p-12 max-w-4xl mx-auto text-center shadow-2xl bg-white/95 backdrop-blur-md border-4 border-green-300 rounded-3xl">
          <div className="animate-bounce mb-6">
            <h1 className="text-8xl font-bold mb-4">🎉</h1>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 drop-shadow-2xl">
              Congratulations!
            </h1>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-green-700 to-blue-700 bg-clip-text text-transparent mb-8">
            You've mastered Fraction Chef!
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl border-4 border-green-300 transform hover:scale-105 transition-all duration-300 shadow-xl">
              <p className="text-5xl font-bold text-green-600 animate-pulse mb-2">{score}</p>
              <p className="text-xl text-green-800 font-bold">Total Score</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl border-4 border-blue-300 transform hover:scale-105 transition-all duration-300 shadow-xl">
              <p className="text-5xl font-bold text-blue-600 animate-pulse mb-2">{level}</p>
              <p className="text-xl text-blue-800 font-bold">Level Reached</p>
            </div>
          </div>
          
          <Button 
            onClick={() => window.location.reload()}
            size="lg"
            className="text-2xl px-12 py-6 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 transform hover:scale-110 transition-all duration-500 shadow-2xl rounded-2xl border-4 border-white font-bold"
          >
            🔄 Play Again! 🎮
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-white/95 to-orange-50/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-2 border-orange-200">
          <div className="flex items-center space-x-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent drop-shadow-lg">
              🍳 Fraction Chef
            </h1>
            <Badge variant="outline" className="text-xl px-6 py-3 bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-400 animate-pulse font-bold rounded-xl shadow-lg">
              Level {level}
            </Badge>
          </div>
          <div className="flex items-center space-x-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white transform hover:scale-125 transition-all duration-300 shadow-xl"
                >
                  <Info className="h-6 w-6 animate-pulse" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl bg-gradient-to-br from-white to-blue-50 border-4 border-blue-300 rounded-2xl shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    🍳 How to Play Fraction Chef
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-300 shadow-lg">
                    <h3 className="font-bold text-2xl mb-4 text-blue-800">🎮 Game Flow:</h3>
                    <ol className="space-y-3 text-lg">
                      <li className="flex items-center">
                        <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-4 font-bold">1</span> 
                        Click on a waiting order to start preparing
                      </li>
                      <li className="flex items-center">
                        <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-4 font-bold">2</span> 
                        Calculate the correct ingredient amounts using fractions
                      </li>
                      <li className="flex items-center">
                        <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-4 font-bold">3</span> 
                        Move to stove/oven to cook the ingredients
                      </li>
                      <li className="flex items-center">
                        <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-4 font-bold">4</span> 
                        Plate and serve when cooking is complete
                      </li>
                    </ol>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border-2 border-orange-300 shadow-lg">
                    <h3 className="font-bold text-2xl mb-4 text-orange-800">🏪 Station Guide:</h3>
                    <div className="grid grid-cols-2 gap-4 text-lg">
                      <div className="flex items-center bg-white/60 p-3 rounded-lg">
                        <span className="text-3xl mr-3">🥄</span> <strong>Prep:</strong> Calculate fractions
                      </div>
                      <div className="flex items-center bg-white/60 p-3 rounded-lg">
                        <span className="text-3xl mr-3">🔥</span> <strong>Stove:</strong> Cook ingredients
                      </div>
                      <div className="flex items-center bg-white/60 p-3 rounded-lg">
                        <span className="text-3xl mr-3">🔥</span> <strong>Oven:</strong> Bake items
                      </div>
                      <div className="flex items-center bg-white/60 p-3 rounded-lg">
                        <span className="text-3xl mr-3">🍽️</span> <strong>Plating:</strong> Complete orders
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-300 shadow-lg">
                    <h3 className="font-bold text-2xl mb-4 text-green-800">💡 Tips for Success:</h3>
                    <ul className="space-y-2 text-lg">
                      <li>• Watch customer patience meters - you have 40 seconds per customer!</li>
                      <li>• Use keyboard input for precise fraction calculations</li>
                      <li>• Check inventory levels before starting orders</li>
                      <li>• Complete 15 orders to win the game!</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <div className="text-2xl font-bold text-gray-700 bg-gradient-to-r from-yellow-100 to-orange-100 px-6 py-3 rounded-xl border-2 border-yellow-400 shadow-lg">
              Score: <span className="text-orange-600 animate-pulse">{score}</span>
            </div>
            <div className="text-xl text-gray-600 bg-gradient-to-r from-green-100 to-blue-100 px-6 py-3 rounded-xl border-2 border-green-400 shadow-lg">
              Orders: <span className="font-bold text-green-600">{ordersCompleted}/15</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Kitchen Stations */}
          <div className="col-span-8">
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Prep Station */}
              <Card className={`p-8 cursor-pointer transition-all duration-500 transform hover:scale-110 hover:-translate-y-4 ${
                currentStation === 'prep' 
                  ? 'ring-4 ring-blue-500 shadow-2xl bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-blue-400 animate-pulse scale-105' 
                  : 'shadow-xl hover:shadow-2xl bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 hover:border-blue-400'
              } rounded-2xl`}>
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">{currentStation === 'prep' ? '🥄' : '🍽️'}</div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Prep Station</h3>
                  <p className="text-lg text-gray-600 font-semibold">Calculate fractions</p>
                  {currentStation === 'prep' && (
                    <div className="mt-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto animate-ping"></div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Stove */}
              <Card className={`p-8 cursor-pointer transition-all duration-500 transform hover:scale-110 hover:-translate-y-4 ${
                currentStation === 'stove' 
                  ? 'ring-4 ring-red-500 shadow-2xl bg-gradient-to-br from-red-100 to-red-200 border-4 border-red-400 animate-pulse scale-105' 
                  : 'shadow-xl hover:shadow-2xl bg-gradient-to-br from-white to-red-50 border-2 border-red-200 hover:border-red-400'
              } rounded-2xl`}>
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">🔥</div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Stove</h3>
                  <p className="text-lg text-gray-600 font-semibold">Cook ingredients</p>
                  {activeOrder?.status === 'cooking' && (
                    <Progress value={activeOrder.cookingProgress || 0} className="mt-3 h-4 rounded-full" />
                  )}
                  {currentStation === 'stove' && (
                    <div className="mt-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full mx-auto animate-ping"></div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Oven */}
              <Card className={`p-8 cursor-pointer transition-all duration-500 transform hover:scale-110 hover:-translate-y-4 ${
                currentStation === 'oven' 
                  ? 'ring-4 ring-orange-500 shadow-2xl bg-gradient-to-br from-orange-100 to-orange-200 border-4 border-orange-400 animate-pulse scale-105' 
                  : 'shadow-xl hover:shadow-2xl bg-gradient-to-br from-white to-orange-50 border-2 border-orange-200 hover:border-orange-400'
              } rounded-2xl`}>
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">🔥</div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Oven</h3>
                  <p className="text-lg text-gray-600 font-semibold">Bake items</p>
                  {currentStation === 'oven' && (
                    <div className="mt-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mx-auto animate-ping"></div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Plating */}
              <Card className={`p-8 cursor-pointer transition-all duration-500 transform hover:scale-110 hover:-translate-y-4 ${
                currentStation === 'plating' 
                  ? 'ring-4 ring-green-500 shadow-2xl bg-gradient-to-br from-green-100 to-green-200 border-4 border-green-400 animate-pulse scale-105' 
                  : 'shadow-xl hover:shadow-2xl bg-gradient-to-br from-white to-green-50 border-2 border-green-200 hover:border-green-400'
              } rounded-2xl`}>
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">🍽️</div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Plating</h3>
                  <p className="text-lg text-gray-600 font-semibold">Serve dishes</p>
                  {currentStation === 'plating' && (
                    <div className="mt-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full mx-auto animate-ping"></div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Active Order Workspace */}
            {activeOrder && currentStation === 'prep' && (
              <Card className="p-8 shadow-2xl bg-gradient-to-br from-white/98 to-blue-50/98 backdrop-blur-md border-4 border-blue-300 rounded-2xl">
                <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                  🧮 Fraction Calculation Workshop
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mb-6 border-2 border-blue-300 shadow-lg">
                  <p className="text-xl font-bold mb-2"><strong>Recipe:</strong> {activeOrder.recipe.name}</p>
                  <p className="text-lg"><strong>Original serving:</strong> {activeOrder.recipe.baseServing} people</p>
                  <p className="text-lg"><strong>Requested serving:</strong> {activeOrder.requestedServing} people</p>
                  <p className="text-lg text-purple-700 mt-3 font-semibold">
                    <strong>Multiplier:</strong> {activeOrder.requestedServing}/{activeOrder.recipe.baseServing} = {(activeOrder.requestedServing / activeOrder.recipe.baseServing).toFixed(2)}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {Object.entries(activeOrder.recipe.ingredients).map(([ingredient, amount]) => {
                    const calculatedAmount = (amount * activeOrder.requestedServing) / activeOrder.recipe.baseServing;
                    return (
                      <div key={ingredient} className="bg-white p-6 rounded-xl border-4 border-gray-200 hover:border-blue-400 transition-all duration-300 transform hover:scale-105 shadow-lg">
                        <label className="block text-lg font-bold text-gray-800 mb-3">
                          {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                        </label>
                        <p className="text-sm text-purple-600 mb-3 font-semibold bg-purple-50 p-2 rounded">
                          Original: {amount} × {(activeOrder.requestedServing / activeOrder.recipe.baseServing).toFixed(2)} = {calculatedAmount.toFixed(2)}
                        </p>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter amount"
                          value={inputValues[ingredient] || ''}
                          onChange={(e) => handleIngredientInput(ingredient, e.target.value)}
                          className="w-full text-lg p-3 focus:ring-4 focus:ring-blue-500 focus:border-blue-500 border-2 rounded-lg"
                        />
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">Available: <span className="font-bold">{inventory[ingredient]}</span></p>
                      </div>
                    );
                  })}
                </div>
                
                <Button 
                  onClick={moveToStove}
                  className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white py-4 text-xl font-bold transform hover:scale-105 transition-all duration-300 shadow-xl rounded-xl border-2 border-white"
                >
                  🔥 Move to Stove & Start Cooking! 🔥
                </Button>
              </Card>
            )}

            {/* Cooking Station */}
            {activeOrder && (currentStation === 'stove' || currentStation === 'oven') && (
              <Card className="p-8 shadow-2xl bg-gradient-to-br from-white/98 to-red-50/98 backdrop-blur-md border-4 border-red-300 rounded-2xl">
                <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent text-center">
                  🔥 Cooking {activeOrder.recipe.name}
                </h3>
                <div className="text-center">
                  <div className="text-8xl mb-6 animate-pulse">
                    {activeOrder.status === 'cooking' ? '🔥' : '✅'}
                  </div>
                  <Progress value={activeOrder.cookingProgress || 0} className="mb-6 h-6 rounded-full" />
                  <p className="text-2xl text-gray-700 mb-6 font-bold">
                    {activeOrder.status === 'cooking' ? 'Cooking in progress...' : 'Ready for plating!'}
                  </p>
                  {activeOrder.status === 'ready' && (
                    <Button 
                      onClick={moveToPlating}
                      className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white py-4 px-8 text-xl font-bold transform hover:scale-110 transition-all duration-300 shadow-xl animate-bounce rounded-xl"
                    >
                      🍽️ Move to Plating Station! ✨
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Plating Station */}
            {activeOrder && currentStation === 'plating' && (
              <Card className="p-8 shadow-2xl bg-gradient-to-br from-white/98 to-green-50/98 backdrop-blur-md border-4 border-green-300 rounded-2xl">
                <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent text-center">
                  🍽️ Plating {activeOrder.recipe.name}
                </h3>
                <div className="text-center">
                  <div className="text-8xl mb-6 animate-bounce">🍽️</div>
                  <p className="text-2xl text-gray-700 mb-8 font-bold">
                    Serve {activeOrder.requestedServing} portions to {activeOrder.customerName}
                  </p>
                  <Button 
                    onClick={completeOrder}
                    className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white py-4 px-10 text-xl font-bold transform hover:scale-125 transition-all duration-300 shadow-2xl animate-pulse rounded-xl border-4 border-white"
                  >
                    ✨ Serve Order! 🎉
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Inventory */}
            <Card className="p-6 shadow-2xl bg-gradient-to-br from-white/98 to-purple-50/98 backdrop-blur-md border-4 border-purple-300 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center">
                <span className="text-3xl mr-3 animate-pulse">📦</span> Kitchen Inventory
              </h3>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {Object.entries(inventory).map(([ingredient, amount]) => (
                  <div key={ingredient} className="flex justify-between items-center py-3 px-4 rounded-xl bg-white/90 hover:bg-white transition-all duration-300 border-2 border-gray-200 hover:border-purple-300 shadow-md">
                    <span className="text-lg capitalize font-bold text-gray-800">{ingredient}</span>
                    <Badge 
                      variant={amount < 3 ? "destructive" : "outline"}
                      className={`text-lg px-3 py-1 ${amount < 3 ? 'animate-pulse bg-red-500 text-white' : 'bg-green-100 text-green-700 border-green-300'} transform hover:scale-110 transition-all duration-300 font-bold`}
                    >
                      {amount.toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Orders Queue */}
            <Card className="p-6 shadow-2xl bg-gradient-to-br from-white/98 to-orange-50/98 backdrop-blur-md border-4 border-orange-300 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center">
                <span className="text-3xl mr-3 animate-bounce">📋</span> Customer Orders ({orders.length}/15)
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {orders.map((order) => (
                  <Card 
                    key={order.id}
                    className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 ${
                      activeOrder?.id === order.id 
                        ? 'ring-4 ring-blue-500 bg-gradient-to-r from-blue-100 to-purple-100 border-4 border-blue-400 scale-105' 
                        : 'bg-white/95 hover:bg-white border-2 border-gray-200 hover:border-orange-300'
                    } ${order.status === 'waiting' ? 'hover:bg-orange-50' : ''} rounded-xl shadow-lg`}
                    onClick={() => selectOrder(order)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-lg flex items-center">
                          <span className="text-2xl mr-2">👤</span>
                          {order.customerName}
                        </p>
                        <p className="text-sm text-gray-700 flex items-center font-semibold">
                          <span className="mr-2">🍽️</span>
                          {order.recipe.name}
                        </p>
                        <p className="text-sm text-gray-600 font-semibold">For {order.requestedServing} people</p>
                      </div>
                      <Badge 
                        variant={
                          order.status === 'waiting' ? 'outline' :
                          order.status === 'preparing' ? 'default' :
                          order.status === 'cooking' ? 'secondary' :
                          order.status === 'ready' ? 'destructive' : 'outline'
                        }
                        className="text-sm animate-pulse font-bold px-3 py-1"
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <Progress 
                      value={(order.patience / order.maxPatience) * 100} 
                      className="h-4 mb-3 rounded-full"
                    />
                    <p className="text-sm text-gray-600 flex items-center font-semibold">
                      <span className="mr-2">⏰</span>
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

using Figurkoder.Domain;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace Figurkoder.ComponentTests.Domain
{
    public class GameEngineFacts
    {
        private readonly ITestOutputHelper _outputHelper;

        public GameEngineFacts(ITestOutputHelper outputHelper)
        {
            _outputHelper = outputHelper;
        }

        #region Legacy?
        [Fact]
        public async Task Given_GameIsPausedLongerThanTimer_When_GameIsRunning_Then_TimerNeverElapses()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(200, new[] { new Flashcard("Foo", "Bar") });
            GameEngine.State state = GameEngine.State.NotStarted;
            var stateChangedReceived = new AutoResetEvent(false);
            gameEngine.CurrentState += StateChangedHandler;

            void StateChangedHandler(object? _, StateEventArgs e)
            {
                state = e.CurrentState;
                stateChangedReceived.Set();
            }
            gameEngine.Start();
            gameEngine.Pause();
            await Task.Delay(400);

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Running, state);
        }

        [Fact]
        public async Task Given_GameIsResumed_When_GameIsPaused_Then_KeepGoing()
        {
            // Arrange
            var c = 0;

            var gameEngine = CreateGameEnginge(1000, new[] { new Flashcard("Foo", "Bar") });
            //GameEngine.State state = GameEngine.State.None;
            var stateChangedReceived = new AutoResetEvent(false);
            gameEngine.CurrentState += StateChangedHandler;

            gameEngine.Start();

            // Act
            gameEngine.Pause();
            await Task.Delay(100);
            gameEngine.Start();

            // Assert
            void StateChangedHandler(object? _, StateEventArgs e)
            {
                c++;
                switch (c)
                {
                    case 4:
                        Assert.Equal(GameEngine.State.Running, e.CurrentState);
                        break;
                    case 5:
                        Assert.Equal(GameEngine.State.Running, e.CurrentState);
                        break;
                    case 6:
                        Assert.Equal(GameEngine.State.Finished, e.CurrentState);
                        break;
                }
                //state = e.CurrentState;
                //stateChangedReceived.Set();
            }
            //Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(1000)));
            //Assert.Equal(4, c);
            //Assert.Equal(GameEngine.State.Resumed, state);

            //Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(1020)));
            //Assert.Equal(5, c);
            //Assert.Equal(GameEngine.State.Running, state);

            //Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(1000)));
            //Assert.Equal(6, c);
            //Assert.Equal(GameEngine.State.Finished, state);
        }

        [Fact]
        public async Task Given_GameIsPaused_When_GameIsRunning_Then_TimeIsNotIncludedInResult()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });
            GameFinishedEventArgs? gameFinishedEvent = null;
            var finishedReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                gameFinishedEvent = e;
                finishedReceived.Set();
            }

            gameEngine.Start();

            // Act
            gameEngine.Pause();
            await Task.Delay(200); // This should not count
            gameEngine.Start();
            await Task.Delay(50);
            gameEngine.Next();

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(200)));
            Assert.Equal(1, gameFinishedEvent?.Results.Length);
            Assert.InRange(gameFinishedEvent?.Average ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(20), TimeSpan.FromMilliseconds(80)); // Allow ±30ms
        }

        [Fact]
        public async Task Given_GameIsStopped_When_GameIsPaused_Then_SkipToResult()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar"), new Flashcard("Foo", "BAr"), new Flashcard("Foo", "baR") });
            GameFinishedEventArgs? gameFinishedEvent = null;
            var finishedReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                gameFinishedEvent = e;
                finishedReceived.Set();
            }

            gameEngine.Start();
            await Task.Delay(50);
            gameEngine.Next();

            // Act
            gameEngine.Pause();
            gameEngine.Stop();

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(200)));
            Assert.Equal(3, gameFinishedEvent?.Results.Length);
            Assert.InRange(gameFinishedEvent?.Average ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(40), TimeSpan.FromMilliseconds(70));
            Assert.InRange(gameFinishedEvent?.Results[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(40), TimeSpan.FromMilliseconds(70));
            Assert.Null(gameFinishedEvent?.Results[1].Time);
            Assert.Null(gameFinishedEvent?.Results[2].Time);
        }
        #endregion

        #region Game is Not Started
        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressStart_Then_TheGameStartsRunning()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var autoResetEvents = Array.Empty<AutoResetEvent>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;

            autoResetEvents = AwaitAllEvents(gameEngine, except: nameof(GameEngine.GameFinished));

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(WaitHandle.WaitAll(autoResetEvents, TimeSpan.FromMilliseconds(250)));
            Assert.Equal(GameEngine.State.Running, gameState);
        }

        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressPause_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Pause();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressReveale_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Reveale();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressNext_Then_GameStarts()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var autoResetEvents = Array.Empty<AutoResetEvent>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;

            autoResetEvents = AwaitAllEvents(gameEngine, except: nameof(GameEngine.GameFinished));

            // Act
            gameEngine.Next();

            // Assert
            Assert.True(WaitHandle.WaitAll(autoResetEvents, TimeSpan.FromMilliseconds(250)));
            Assert.Equal(GameEngine.State.Running, gameState);
        }

        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressStop_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Stop();

            // Assert
        }
        #endregion

        #region Game is Running
        [Fact]
        public void Given_GameStateIsRunning_When_UserPressStart_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();

            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Start();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsRunning_When_UserPressPause_Then_GameIsPaused()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var autoResetEvents = Array.Empty<AutoResetEvent>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;

            gameEngine.Start();

            autoResetEvents = AwaitAllEvents(gameEngine);


            // Act
            gameEngine.Pause();

            // Assert
            // Pause for longer than one cycle (50ms) and then abort
            Assert.False(WaitHandle.WaitAll(autoResetEvents, TimeSpan.FromMilliseconds(100))); 
            Assert.Equal(GameEngine.State.Paused, gameState);
        }

        [Fact]
        public void Given_GameStateIsRunning_When_UserPressReveale_Then_NoEventsIsTriggered()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var autoResetEvents = Array.Empty<AutoResetEvent>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();

            autoResetEvents = AwaitAllEvents(gameEngine);

            gameEngine.CurrentState += StateChanged;

            // Act
            gameEngine.Reveale();

            // Assert
            // Pause for longer than one cycle (50ms) and then abort
            Assert.False(WaitHandle.WaitAll(autoResetEvents, TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Revealed, gameState);
        }

        [Fact]
        public async Task Given_GameStateIsRunning_When_UserPressReveale_Then_CardIsMarkedAsReveleadInTheResults()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.GameFinished += (_, e) => results = e.Results;
            gameEngine.Start();

            // Act
            gameEngine.Reveale();

            // Finish the game
            gameEngine.Next();
            await Task.Delay(TimeSpan.FromMilliseconds(25));
            gameEngine.Next();

            // Assert
            Assert.Equal(GameEngine.State.Finished, gameState);
            Assert.Null(results[0].Time);
            Assert.InRange(results[1].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(10), TimeSpan.FromMilliseconds(50));
        }

        [Fact]
        public void Given_GameStateIsRunning_When_UserPressNext_Then_AdvanceForward()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            AutoResetEvent currentChanged = new(false);

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.Start();
            gameEngine.Current += (_, _) => currentChanged.Set();

            // Act
            gameEngine.Next();

            // Assert
            Assert.True(currentChanged.WaitOne(TimeSpan.FromMilliseconds(25)));
            Assert.Equal(GameEngine.State.Running, gameState);
        }

        [Fact]
        public void Given_GameStateIsRunning_When_UserPressStop_Then_FinishGame()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var events = Array.Empty<AutoResetEvent>();
            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;

            gameEngine.GameFinished += (_, e) => results = e.Results;

            events = AwaitAllEvents(gameEngine, onlyOnce: false);

            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            Assert.True(WaitHandle.WaitAll(events, TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Finished, gameState);
            Assert.Equal(2, results.Length);
            Assert.Null(results[0].Time);
            Assert.Null(results[1].Time);
        }

        [Fact]
        public async Task Given_GameStateIsRunning_When_UserPressStop_Then_ShowResults()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var events = Array.Empty<AutoResetEvent>();
            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;

            gameEngine.GameFinished += (_, e) => results = e.Results;

            events = AwaitAllEvents(gameEngine, onlyOnce: false);

            gameEngine.Start();
            await Task.Delay(10);
            gameEngine.Next();

            await Task.Delay(25);

            // Act
            gameEngine.Stop();

            // Assert
            Assert.True(WaitHandle.WaitAll(events, TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Finished, gameState);
            Assert.Equal(2, results.Length);
            Assert.NotNull(results[0].Time);
            Assert.InRange(results[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(10), TimeSpan.FromMilliseconds(50));
            Assert.Null(results[1].Time);
        }
        #endregion

        #region Game is Paused
        [Fact]
        public void Given_GameStateIsPaused_When_UserPressStart_Then_ResumeGame()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var autoResetEvents = Array.Empty<AutoResetEvent>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.Start();
            gameEngine.Pause();

            autoResetEvents = AwaitAllEvents(gameEngine, except: nameof(GameEngine.GameFinished));

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(WaitHandle.WaitAll(autoResetEvents, TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Running, gameState);
        }

        [Fact]
        public void Given_GameStateIsPaused_When_UserPressPause_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Pause();

            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Pause();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsPaused_When_UserPressReveale_Then_NoEventsIsTriggered()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var autoResetEvents = Array.Empty<AutoResetEvent>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.Start();
            gameEngine.Pause();

            autoResetEvents = AwaitAllEvents(gameEngine);

            // Act
            gameEngine.Reveale();

            // Assert
            // Pause for longer than one cycle (50ms) and then abort
            Assert.False(WaitHandle.WaitAll(autoResetEvents, TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Revealed, gameState);
        }

        [Fact]
        public async Task Given_GameStateIsPaused_When_UserPressReveale_Then_CardIsMarkedAsReveleadInTheResults()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.GameFinished += (_, e) => results = e.Results;
            gameEngine.Start();
            gameEngine.Pause();

            // Act
            gameEngine.Reveale();

            // Finish the game
            gameEngine.Next();
            await Task.Delay(TimeSpan.FromMilliseconds(25));
            gameEngine.Next();

            // Assert
            Assert.Equal(GameEngine.State.Finished, gameState);
            Assert.Null(results[0].Time);
            Assert.InRange(results[1].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(10), TimeSpan.FromMilliseconds(50));
        }

        [Fact]
        public void Given_GameStateIsPaused_When_UserPressNext_Then_AdvanceForward()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var autoResetEvents = Array.Empty<AutoResetEvent>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.Start();
            gameEngine.Pause();
            autoResetEvents = AwaitAllEvents(gameEngine, except: nameof(GameEngine.GameFinished));

            // Act
            gameEngine.Next();

            // Assert
            Assert.True(WaitHandle.WaitAll(autoResetEvents, TimeSpan.FromMilliseconds(75)));
            Assert.Equal(GameEngine.State.Running, gameState);
        }

        [Fact]
        public void Given_GameStateIsPaused_When_UserPressStop_Then_EndGame()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.Start();
            gameEngine.Pause();

            gameEngine.GameFinished += (_, e) => results = e.Results;

            // Act
            gameEngine.Stop();

            // Assert
            Assert.Equal(GameEngine.State.Finished, gameState);
            Assert.Equal(2, results.Length);
            Assert.Null(results[0].Time);
            Assert.Null(results[1].Time);
        }

        [Fact]
        public async Task Given_GameStateIsPaused_When_UserPressStop_Then_ShowResults()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var events = Array.Empty<AutoResetEvent>();
            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
                    
            gameEngine.GameFinished += (_, e) => results = e.Results;

            events = AwaitAllEvents(gameEngine, onlyOnce: false);

            gameEngine.Start();
            await Task.Delay(10);
            gameEngine.Next();
            await Task.Delay(10);
            gameEngine.Pause();

            await Task.Delay(10);

            // Act
            gameEngine.Stop();

            // Assert
            Assert.True(WaitHandle.WaitAll(events, TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Finished, gameState);
            Assert.Equal(2, results.Length);
            Assert.InRange(results[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(10), TimeSpan.FromMilliseconds(50));
            Assert.Null(results[1].Time);
        }
        #endregion

        #region Game is Revealed
        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressStart_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Reveale();

            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Start();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressPause_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Reveale();

            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Pause();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressReveale_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Reveale();

            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Reveale();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressNext_Then_AdvanceForward()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var autoResetEvents = Array.Empty<AutoResetEvent>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.Start();
            gameEngine.Reveale();
            autoResetEvents = AwaitAllEvents(gameEngine, except: nameof(GameEngine.GameFinished));

            // Act
            gameEngine.Next();

            // Assert
            Assert.True(WaitHandle.WaitAll(autoResetEvents, TimeSpan.FromMilliseconds(75)));
            Assert.Equal(GameEngine.State.Running, gameState);
        }

        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressStop_Then_EndGame()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.CurrentState += StateChanged;
            gameEngine.Start();
            gameEngine.Reveale();

            gameEngine.GameFinished += (_, e) => results = e.Results;

            // Act
            gameEngine.Stop();

            // Assert
            Assert.Equal(GameEngine.State.Finished, gameState);
            Assert.Equal(2, results.Length);
            Assert.Null(results[0].Time);
            Assert.Null(results[1].Time);
        }

        [Fact]
        public async Task Given_GameStateIsRevealed_When_UserPressStop_Then_ShowResults()
        {
            // Arrange
            GameEngine.State? gameState = null;
            void StateChanged(object? _, StateEventArgs e) { gameState = e.CurrentState; }

            var events = Array.Empty<AutoResetEvent>();
            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);
            gameEngine.CurrentState += StateChanged;
            gameEngine.GameFinished += (_, e) => results = e.Results;

            events = AwaitAllEvents(gameEngine, onlyOnce: false);

            gameEngine.Start();
            await Task.Delay(30);
            gameEngine.Next();
            await Task.Delay(30);
            gameEngine.Reveale();

            await Task.Delay(25);

            // Act
            gameEngine.Stop();

            // Assert
            Assert.True(WaitHandle.WaitAll(events, TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Finished, gameState);
            Assert.Equal(2, results.Length);
            Assert.InRange(results[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(10), TimeSpan.FromMilliseconds(50));
            Assert.Null(results[1].Time);
        }
        #endregion

        #region Game is Finished
        [Fact]
        public async Task Given_GameStateIsFinished_When_UserPressStart_Then_RestartGameAsync()
        {
            // Arrange
            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);
                
            gameEngine.Start();
            gameEngine.Stop();
            await Task.Delay(100);
            gameEngine.GameFinished += (_, e) => results = e.Results;

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(WaitHandle.WaitAll(AwaitAllEvents(gameEngine, onlyOnce: false), TimeSpan.FromMilliseconds(250)));
            Assert.Equal(2, results.Length);
        }

        [Fact]
        public void Given_GameStateIsFinished_When_UserPressPause_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Stop();
            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Pause();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsFinished_When_UserPressReveale_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Stop();
            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Reveale();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsFinished_When_UserPressNext_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Stop();
            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Next();

            // Assert
        }

        [Fact]
        public void Given_GameStateIsFinished_When_UserPressStop_Then_NothingHappens()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Stop();
            BoobyTrapAllEvents(gameEngine);

            // Act
            gameEngine.Stop();

            // Assert
        }
        #endregion

        private GameEngine CreateGameEnginge(int ms, Flashcard[]? flashcards = null)
            => new ServiceCollection()
                .AddLogging((builder) =>
                {
                    builder.SetMinimumLevel(LogLevel.Debug);
                    builder.AddXUnit(_outputHelper);
                })
                .AddSingleton<GameEngineFactory>()
                .BuildServiceProvider()
                .GetRequiredService<GameEngineFactory>()
                .Create(
                    new Game(
                        TimeSpan.FromMilliseconds(ms),
                        flashcards ?? new[] { new Flashcard("Foo", "Bar"), new Flashcard("fOO", "bAR") },
                        false));

        private static AutoResetEvent[] AwaitAllEvents<T>(T obj, string? except = null, bool? onlyOnce = true)
            where T : class
        {
            List<AutoResetEvent> events = new();
            HashSet<string> eventsTriggered = new();

            RegisterToAllEvents(
                obj,
                @event =>
                {
                    AutoResetEvent autoResetEvent = new(false);
                    var setMethodInfo = typeof(AutoResetEvent).GetMethod(nameof(AutoResetEvent.Set))!;
                    var addMethodInfo = typeof(HashSet<string>).GetMethod(nameof(HashSet<string>.Add))!;
                    events.Add(autoResetEvent);

                    return Expression.Block(
                        Expression.IfThen(
                            Expression.And(
                                Expression.Constant(onlyOnce),
                                Expression.IsFalse(Expression.Call(
                                    Expression.Constant(eventsTriggered),
                                    addMethodInfo,
                                    Expression.Constant(@event.Name)))),
                            Expression.Throw(
                                Expression.New(
                                    typeof(InvalidOperationException).GetConstructor(new[] { typeof(string) })!, 
                                    Expression.Constant($"{@event.Name} triggered more than once."))
                            )
                        ),
                        Expression.Call(Expression.Constant(autoResetEvent), setMethodInfo)
                    );
                },
                except);

            return events.ToArray();
        }

        private static void BoobyTrapAllEvents<T>(T obj, string? except = null)
            where T : class 
            => RegisterToAllEvents(
                obj,
                @event => Expression.Throw(Expression.Constant(new InvalidOperationException($"{@event.Name} should not be triggered."))),
                except);

        private static void RegisterToAllEvents<T>(T obj, Func<EventInfo, Expression> body, string? except = null)
            where T : class
        {
            foreach (var @event in obj
            .GetType()
            .GetEvents()
            .Where(x => !x.Name.Equals(except ?? string.Empty, StringComparison.OrdinalIgnoreCase)))
            {
                var addMethod = @event.GetAddMethod()!;

                var senderParam = Expression.Parameter(typeof(object));
                var eventParam = Expression.Parameter(addMethod.GetParameters().Single().ParameterType.GetGenericArguments().Single());

                var lambda = Expression.Lambda(addMethod.GetParameters().Single().ParameterType, body(@event), senderParam, eventParam);

                var eventHandler = lambda.Compile();

                var eventHandlers = Array.CreateInstance(typeof(Delegate), 1);

                eventHandlers.SetValue(eventHandler, 0);

                addMethod.Invoke(obj, (object?[])eventHandlers);
            }
        }
    }
}

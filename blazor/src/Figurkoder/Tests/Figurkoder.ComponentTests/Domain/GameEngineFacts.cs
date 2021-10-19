using Figurkoder.Domain;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Reactive.Testing;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Linq.Expressions;
using System.Reactive;
using System.Reactive.Linq;
using System.Reactive.Subjects;
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

        [Fact]
        public async Task Given_GameIsPausedLongerThanTimer_When_GameIsRunning_Then_TimerNeverElapses()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<StateChangedEvent>();
            var gameEngine = CreateGameEnginge(200, new[] { new Flashcard("Foo", "Bar") });
            gameEngine.Events.OfType<StateChangedEvent>().Subscribe(observer);
            gameEngine.Start();
            gameEngine.Pause();
            await Task.Delay(400);

            // Act
            gameEngine.Start();

            // Assert
            var states = observer.Messages.Select(x => x.Value.Value.CurrentState).ToArray();
            Assert.Equal(GameEngine.State.Running, states[0]);
            Assert.Equal(GameEngine.State.Paused, states[1]);
            Assert.Equal(GameEngine.State.Running, states[2]);
        }

        [Fact]
        public async Task Given_GameIsResumed_When_GameIsPaused_Then_KeepGoing()
        {
            // Arrange
            // Arrange
            var observer = new TestScheduler().CreateObserver<StateChangedEvent>();
            var gameEngine = CreateGameEnginge(1000, new[] { new Flashcard("Foo", "Bar") });
            gameEngine.Events.OfType<StateChangedEvent>().Subscribe(observer);

            gameEngine.Start();

            // Act
            gameEngine.Pause();
            await Task.Delay(100);
            gameEngine.Start();

            // Assert
            gameEngine.Events.Wait();
            var states = observer.Messages.Where(x => x.Value.HasValue).Select(x => x.Value.Value.CurrentState).ToArray();
            Assert.Equal(GameEngine.State.Running, states[0]);
            Assert.Equal(GameEngine.State.Paused, states[1]);
            Assert.Equal(GameEngine.State.Running, states[2]);
            Assert.Equal(GameEngine.State.Finished, states[3]);
        }

        [Fact]
        public async Task Given_GameIsPaused_When_GameIsRunning_Then_TimeIsNotIncludedInResult()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });

            var events = gameEngine.Events
                .OfType<GameFinishedEvent>()
                .Replay();

            using var _ = events.Connect();

            gameEngine.Start();

            // Act
            gameEngine.Pause();
            await Task.Delay(200); // This should not count
            gameEngine.Start();
            await Task.Delay(50);
            gameEngine.Next();

            // Assert
            var gameFinishedEvent = await events.SingleAsync();
            Assert.Equal(1, gameFinishedEvent?.Results.Length);
            Assert.InRange(gameFinishedEvent?.Average ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(20), TimeSpan.FromMilliseconds(80)); // Allow ±30ms
        }

        [Fact]
        public async Task Given_GameIsStopped_When_GameIsPaused_Then_SkipToResult()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar"), new Flashcard("Foo", "BAr"), new Flashcard("Foo", "baR") });
            
            var events = gameEngine.Events
                .OfType<GameFinishedEvent>()
                .Replay();

            events.Connect();

            gameEngine.Start();
            await Task.Delay(50);
            gameEngine.Next();

            // Act
            gameEngine.Pause();
            gameEngine.Stop();

            // Assert
            var gameFinishedEvent = await events.SingleAsync();
            Assert.Equal(3, gameFinishedEvent?.Results.Length);
            Assert.InRange(gameFinishedEvent?.Average ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(40), TimeSpan.FromMilliseconds(70));
            Assert.InRange(gameFinishedEvent?.Results[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(40), TimeSpan.FromMilliseconds(70));
            Assert.Null(gameFinishedEvent?.Results[1].Time);
            Assert.Null(gameFinishedEvent?.Results[2].Time);
        }

        [Fact]
        public void Given_SubscribedToSecondsLeft_When_GameIsRunning_Then_TickTock()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<int>();
            var gameEngine = CreateGameEnginge(3000, new[] { new Flashcard("Foo", "Bar") });
            gameEngine.SecondsLeft.Subscribe(observer);

            // Act
            gameEngine.Start();

            // Assert
            gameEngine.SecondsLeft.Wait();
            Assert.True(observer.Messages.Where(x => x.Value.HasValue).Select(x => x.Value.Value).SequenceEqual(new[] {3, 2, 1}));
        }

        // Changing state

        #region Game is Not Started
        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressStart_Then_TheGameStartsRunning()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserverFor<StateChangedEvent>();

            // Act
            gameEngine.Start();

            // Assert
            Assert.Equal(GameEngine.State.Running, observer.Messages.Single().Value.Value.CurrentState);
        }

        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressPause_Then_NothingHappens()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            // Act
            gameEngine.Pause();

            // Assert
            Assert.Equal(0, observer.Messages.Count);
        }

        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressReveale_Then_NothingHappens()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            // Act
            gameEngine.Reveale();

            // Assert
            Assert.Equal(0, observer.Messages.Count);
        }

        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressNext_Then_GameStarts()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserverFor<StateChangedEvent>();

            // Act
            gameEngine.Next();

            // Assert
            Assert.Equal(GameEngine.State.Running, observer.Messages.Single().Value.Value.CurrentState);
        }

        [Fact]
        public void Given_GameStateIsNotStarted_When_UserPressStop_Then_NothingHappens()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            // Act
            gameEngine.Stop();

            // Assert
            Assert.Equal(0, observer.Messages.Count);
        }
        #endregion

        #region Game is Running
        [Fact]
        public void Given_GameStateIsRunning_When_UserPressStart_Then_NothingHappens()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            gameEngine.Start();

            // Act
            gameEngine.Start();

            // Assert
            var events = GetEvents(observer);

            Assert.Equal(2, events.Length);
            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[0]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[1]);
        }

        [Fact]
        public async Task Given_GameStateIsRunning_When_UserPressPause_Then_GameIsPaused()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserverFor<StateChangedEvent>();

            gameEngine.Start();

            // Act
            gameEngine.Pause();

            // Assert
            // Pause for longer than one cycle (50ms) and then abort
            await Task.Delay(TimeSpan.FromMilliseconds(100));
            Assert.Equal(GameEngine.State.Paused, GetLatestEvent(observer).CurrentState);
        }

        [Fact]
        public async Task Given_GameStateIsRunning_When_UserPressReveale_Then_NoEventsIsTriggered()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            // Act
            gameEngine.Reveale();

            // Assert
            // Pause for longer than one cycle (50ms) and then abort
            await Task.Delay(TimeSpan.FromMilliseconds(100));
            var events = GetEvents(observer);
            Assert.Equal(1, events.Length);
            Assert.Equal(GameEngine.State.Revealed, Assert.IsType<StateChangedEvent>(events.Single()).CurrentState);
        }

        [Fact]
        public async Task Given_GameStateIsRunning_When_UserPressReveale_Then_CardIsMarkedAsReveleadInTheResults()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();
            gameEngine.Start();

            // Act
            gameEngine.Reveale();

            // Finish the game
            gameEngine.Next();
            await Task.Delay(TimeSpan.FromMilliseconds(25));
            gameEngine.Next();

            // Assert
            var results = GetEvents<GameFinishedEvent>(observer).Single().Results;

            Assert.Equal(GameEngine.State.Finished, GetLastEvent<StateChangedEvent>(observer).CurrentState);
            Assert.Null(results[0].Time);
            Assert.InRange(results[1].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(10), TimeSpan.FromMilliseconds(50));
        }

        [Fact]
        public void Given_GameStateIsRunning_When_UserPressNext_Then_AdvanceForward()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            gameEngine.Start();

            // Act
            gameEngine.Next();

            // Assert
            Assert.Equal(2, GetEvents<NextFlashcardEvent>(observer).Length);
            Assert.All(GetEvents<StateChangedEvent>(observer), x => Assert.Equal(GameEngine.State.Running, x.CurrentState));
        }

        [Fact]
        public async Task Given_GameStateIsRunning_When_UserPressStop_Then_FinishGameAsync()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var events = gameEngine.Events.Replay();

            events.Connect();

            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            var gameFinishedEvent = await events.OfType<GameFinishedEvent>().SingleAsync();
            var stateChangedEvent = await events.OfType<StateChangedEvent>().LastAsync();
            var results = gameFinishedEvent.Results;

            Assert.Equal(GameEngine.State.Finished, stateChangedEvent.CurrentState);
            Assert.Equal(2, results.Length);
            Assert.Null(results[0].Time);
            Assert.Null(results[1].Time);
        }

        [Fact]
        public async Task Given_GameStateIsRunning_When_UserPressStop_Then_ShowResults()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var events = gameEngine.Events.Replay();

            events.Connect();

            gameEngine.Start();
            await Task.Delay(10);
            gameEngine.Next();

            await Task.Delay(25);

            // Act
            gameEngine.Stop();

            // Assert
            var gameFinishedEvent = await events.OfType<GameFinishedEvent>().SingleAsync();
            var stateChangedEvent = await events.OfType<StateChangedEvent>().LastAsync();
            var results = gameFinishedEvent.Results;

            Assert.Equal(GameEngine.State.Finished, stateChangedEvent.CurrentState);
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
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            gameEngine.Start();
            gameEngine.Pause();

            // Act
            gameEngine.Start();

            // Assert
            var states = GetEvents<StateChangedEvent>(observer).Select(x => x.CurrentState).ToArray();
            Assert.Equal(3, states.Length);
            Assert.Equal(GameEngine.State.Running, states[0]);
            Assert.Equal(GameEngine.State.Paused, states[1]);
            Assert.Equal(GameEngine.State.Running, states[2]);
        }

        [Fact]
        public void Given_GameStateIsPaused_When_UserPressPause_Then_NothingHappens()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            gameEngine.Start();
            gameEngine.Pause();

            // Act
            gameEngine.Pause();

            // Assert
            var events = GetEvents(observer);

            Assert.Equal(3, events.Length);
            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[0]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[1]);
            Assert.Equal(GameEngine.State.Paused, Assert.IsType<StateChangedEvent>(events[2]).CurrentState);
        }

        [Fact]
        public async void Given_GameStateIsPaused_When_UserPressReveale_Then_NoEventsIsTriggered()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserverFor<StateChangedEvent>();

            gameEngine.Start();
            gameEngine.Pause();

            // Act
            gameEngine.Reveale();

            // Assert
            // Pause for longer than one cycle (50ms) and then abort
            await Task.Delay(TimeSpan.FromMilliseconds(100));
            Assert.Equal(GameEngine.State.Revealed, GetLatestEvent(observer).CurrentState);
        }

        [Fact]
        public async Task Given_GameStateIsPaused_When_UserPressReveale_Then_CardIsMarkedAsReveleadInTheResults()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var events = gameEngine.Events.Replay();

            events.Connect();

            gameEngine.Start();
            gameEngine.Pause();

            // Act
            gameEngine.Reveale();

            // Finish the game
            gameEngine.Next();
            await Task.Delay(TimeSpan.FromMilliseconds(25));
            gameEngine.Next();

            // Assert
            var gameFinishedEvent = await events.OfType<GameFinishedEvent>().SingleAsync();
            var stateChangedEvent = await events.OfType<StateChangedEvent>().LastAsync();
            var results = gameFinishedEvent.Results;

            Assert.Equal(GameEngine.State.Finished, stateChangedEvent.CurrentState);
            Assert.Null(results[0].Time);
            Assert.InRange(results[1].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(10), TimeSpan.FromMilliseconds(50));
        }

        [Fact]
        public void Given_GameStateIsPaused_When_UserPressNext_Then_AdvanceForward()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            gameEngine.Start();
            gameEngine.Pause();

            // Act
            gameEngine.Next();

            // Assert
            var events = GetEvents(observer);

            Assert.Equal(5, events.Length);

            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[0]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[1]);
            Assert.Equal(GameEngine.State.Paused, Assert.IsType<StateChangedEvent>(events[2]).CurrentState);
            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[3]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[4]);
        }

        [Fact]
        public void Given_GameStateIsPaused_When_UserPressStop_Then_EndGame()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Pause();

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            // Act
            gameEngine.Stop();

            // Assert
            var results = GetEvent<GameFinishedEvent>(observer).Results;

            Assert.Equal(GameEngine.State.Finished, GetLastEvent<StateChangedEvent>(observer).CurrentState);
            Assert.Equal(2, results.Length);
            Assert.Null(results[0].Time);
            Assert.Null(results[1].Time);
        }

        [Fact]
        public async Task Given_GameStateIsPaused_When_UserPressStop_Then_ShowResults()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            gameEngine.Start();
            await Task.Delay(10);
            gameEngine.Next();
            await Task.Delay(10);
            gameEngine.Pause();

            await Task.Delay(10);

            // Act
            gameEngine.Stop();

            // Assert
            var results = GetEvent<GameFinishedEvent>(observer).Results;

            Assert.Equal(GameEngine.State.Finished, GetLastEvent<StateChangedEvent>(observer).CurrentState);
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
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            gameEngine.Start();
            gameEngine.Reveale();

            // Act
            gameEngine.Start();

            // Assert
            var events = GetEvents(observer);

            Assert.Equal(3, events.Length);
            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[0]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[1]);
            Assert.Equal(GameEngine.State.Revealed, Assert.IsType<StateChangedEvent>(events[2]).CurrentState);
        }

        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressPause_Then_NothingHappens()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            gameEngine.Start();
            gameEngine.Reveale();

            // Act
            gameEngine.Pause();

            // Assert
            var events = GetEvents(observer);

            Assert.Equal(3, events.Length);
            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[0]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[1]);
            Assert.Equal(GameEngine.State.Revealed, Assert.IsType<StateChangedEvent>(events[2]).CurrentState);
        }

        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressReveale_Then_NothingHappens()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            gameEngine.Start();
            gameEngine.Reveale();

            // Act
            gameEngine.Reveale();

            // Assert
            var events = GetEvents(observer);

            Assert.Equal(3, events.Length);
            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[0]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[1]);
            Assert.Equal(GameEngine.State.Revealed, Assert.IsType<StateChangedEvent>(events[2]).CurrentState);
        }

        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressNext_Then_AdvanceForward()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            gameEngine.Start();
            gameEngine.Reveale();

            // Act
            gameEngine.Next();

            // Assert
            var events = GetEvents(observer);

            Assert.Equal(5, events.Length);

            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[0]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[1]);
            Assert.Equal(GameEngine.State.Revealed, Assert.IsType<StateChangedEvent>(events[2]).CurrentState);
            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[3]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[4]);
        }

        [Fact]
        public void Given_GameStateIsRevealed_When_UserPressStop_Then_EndGame()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            gameEngine.Start();
            gameEngine.Reveale();
            
            // Act
            gameEngine.Stop();

            // Assert
            var results = GetEvent<GameFinishedEvent>(observer).Results;

            Assert.Equal(GameEngine.State.Finished, GetLastEvent<StateChangedEvent>(observer).CurrentState);
            Assert.Equal(2, results.Length);
            Assert.Null(results[0].Time);
            Assert.Null(results[1].Time);
        }

        [Fact]
        public async Task Given_GameStateIsRevealed_When_UserPressStop_Then_ShowResults()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);
            
            var observer = gameEngine.Events.CreateSubscribedTestableObserver();

            gameEngine.Start();
            await Task.Delay(30);
            gameEngine.Next();
            await Task.Delay(30);
            gameEngine.Reveale();

            await Task.Delay(25);

            // Act
            gameEngine.Stop();

            // Assert
            var results = GetEvent<GameFinishedEvent>(observer).Results;

            Assert.Equal(GameEngine.State.Finished, GetLastEvent<StateChangedEvent>(observer).CurrentState);
            Assert.Equal(2, results.Length);
            Assert.InRange(results[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(10), TimeSpan.FromMilliseconds(50));
            Assert.Null(results[1].Time);
        }
        #endregion

        #region Game is Finished
        [Fact]
        public void Given_GameStateIsFinished_When_UserPressStart_Then_Throw()
        {
            // Arrange
            var results = Array.Empty<Result>();

            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Stop();

            // Act
            var exception = Record.Exception(() => gameEngine.Start());

            // Assert
            Assert.IsType<InvalidOperationException>(exception);
        }

        [Fact]
        public void Given_GameStateIsFinished_When_UserPressPause_Then_Throw()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Stop();

            // Act
            var exception = Record.Exception(() => gameEngine.Pause());

            // Assert
            Assert.IsType<InvalidOperationException>(exception);
        }

        [Fact]
        public void Given_GameStateIsFinished_When_UserPressReveale_Then_Throw()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Stop();

            // Act
            var exception = Record.Exception(() => gameEngine.Reveale());

            // Assert
            Assert.IsType<InvalidOperationException>(exception);
        }

        [Fact]
        public void Given_GameStateIsFinished_When_UserPressNext_Then_Throw()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Start();
            gameEngine.Stop();

            // Act
            var exception = Record.Exception(() => gameEngine.Next());

            // Assert
            Assert.IsType<InvalidOperationException>(exception);
        }

        [Fact]
        public void Given_GameStateIsFinished_When_UserPressStop_Then_NothingHappens()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();
            var gameEngine = CreateGameEnginge(50);

            gameEngine.Events.Subscribe(observer);

            gameEngine.Start();
            gameEngine.Stop();

            // Act
            gameEngine.Stop();

            // Assert
            var events = GetEvents(observer);

            Assert.Equal(4, events.Length);
            Assert.Equal(GameEngine.State.Running, Assert.IsType<StateChangedEvent>(events[0]).CurrentState);
            Assert.IsType<NextFlashcardEvent>(events[1]);
            Assert.Equal(GameEngine.State.Finished, Assert.IsType<StateChangedEvent>(events[2]).CurrentState);
            Assert.IsType<GameFinishedEvent>(events[3]);
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

        private static T GetEvent<T>(ITestableObserver<GameEventBase> observable)
            where T : GameEventBase => GetEvents<T>(observable).Single();

        private static T GetLastEvent<T>(ITestableObserver<GameEventBase> observable)
            where T : GameEventBase => GetEvents<T>(observable).Last();

        private static T GetLatestEvent<T>(ITestableObserver<T> observable)
            where T : GameEventBase => GetEvents<T>(observable).Last();

        private static T[] GetEvents<T>(ITestableObserver<GameEventBase> observable)
            where T : GameEventBase => observable.Messages
                .Where(x => x.Value.HasValue)
                .Select(x => x.Value.Value)
                .OfType<T>()
                .ToArray();

        private static T[] GetEvents<T>(ITestableObserver<T> observable)
            where T : GameEventBase => observable.Messages
                .Where(x => x.Value.HasValue)
                .Select(x => x.Value.Value)
                .ToArray();

        private static ITestableObserver<T> CreateObserver<T>() where T : GameEventBase => new TestScheduler().CreateObserver<T>();
    }

    public static class IObservableOfTExtensions
    {
        public static ITestableObserver<TResult> CreateSubscribedTestableObserverFor<TResult>(this IObservable<object> observable)
            where TResult : class
        {
            var observer = new TestScheduler().CreateObserver<TResult>();

            Observable.OfType<TResult>(observable).Subscribe(observer);

            return observer;
        }

        public static ITestableObserver<GameEventBase> CreateSubscribedTestableObserver(this IObservable<GameEventBase> observable)
        {
            var observer = new TestScheduler().CreateObserver<GameEventBase>();

            observable.Subscribe(observer);

            return observer;
        }

        public static IConnectableObservable<TResult> GetConnectedObservable<TResult>(this IObservable<object> observable)
            where TResult : class
        {
            var observableFor = Observable.OfType<TResult>(observable).Replay();

            observableFor.Connect();

            return observableFor;
        }

        public static IConnectableObservable<T> GetConnectedObservable<T>(this IObservable<T> observable)
            where T : GameEventBase
        {
            var observableFor = observable.Replay();

            observableFor.Connect();

            return observableFor;
        }

        public static void SubscribeTo<TResult>(this IObservable<object> observable, IObserver<TResult> observer)
            where TResult : class
            => Observable.OfType<TResult>(observable).Subscribe(observer);
    }
}

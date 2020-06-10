using Figurkoder.Domain;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Figurkoder.ComponentTests.Domain
{
    public class GameEngineFacts
    {
        [Fact]
        public async Task Given_GameIsPausedLongerThanTimer_When_GameIsRunning_Then_TimerNeverElapses()
        {
            // Arrange
            var gameEngine = new GameEngine(new Game(TimeSpan.FromMilliseconds(200), new[] { KeyValuePair.Create("Foo", "Bar") }, false));
            GameEngine.State state = GameEngine.State.None;
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
            Assert.Equal(GameEngine.State.Resumed, state);
        }

        [Fact]
        public async Task Given_GameIsResumed_When_GameIsPaused_Then_KeepGoing()
        {
            // Arrange
            var c = 0;

            var gameEngine = new GameEngine(new Game(TimeSpan.FromMilliseconds(1000), new[] { KeyValuePair.Create("Foo", "Bar") }, false));
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
                        Assert.Equal(GameEngine.State.Resumed, e.CurrentState);
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
            var gameEngine = new GameEngine(new Game(TimeSpan.FromMilliseconds(100), new[] { KeyValuePair.Create("Foo", "Bar") }, false));
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
            await Task.Delay(200);
            gameEngine.Start();

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(200)));
            Assert.Equal(1, gameFinishedEvent?.Result.Length);
            Assert.Equal(TimeSpan.FromMilliseconds(100), gameFinishedEvent?.Average);
        }

        [Fact]
        public async Task Given_GameIsStopped_When_GameIsPaused_Then_SkipToResult()
        {
            // Arrange
            var gameEngine = new GameEngine(
                new Game(
                    TimeSpan.FromMilliseconds(100),
                    new[]
                    {
                        KeyValuePair.Create("Foo", "Bar"),
                        KeyValuePair.Create("Foo", "Bar"),
                        KeyValuePair.Create("Foo", "Bar")
                    },
                    false));
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
            Assert.Equal(3, gameFinishedEvent?.Result.Length);
            Assert.InRange(gameFinishedEvent?.Average ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(40), TimeSpan.FromMilliseconds(70));
            Assert.InRange(gameFinishedEvent?.Result[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(40), TimeSpan.FromMilliseconds(70));
            Assert.Null(gameFinishedEvent?.Result[1].Time);
            Assert.Null(gameFinishedEvent?.Result[2].Time);
        }
    }
}

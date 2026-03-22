using MetInvTask.Models;
using Microsoft.AspNetCore.Mvc;

namespace MetInvTask.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EquipmentController : Controller
    {
        private static List<EquipmentDto> _equipment = new List<EquipmentDto>
        {
            new EquipmentDto { Id = "KKD-11", Name = "Crusher KKD-11", Status = "STOP" },
            new EquipmentDto { Id = "KSD-4", Name = "Crusher KSD-4", Status = "STOP" },
            new EquipmentDto { Id = "K-1", Name = "Conveyor K-1", Status = "STOP" },
            new EquipmentDto { Id = "BN-KRD", Name = "Bunker KRD", Status = "STOP" },
            new EquipmentDto { Id = "KRD-12", Name = "Crusher KRD-12", Status = "STOP" }
        };

        private static Random _random = new Random();

        [HttpGet]
        public ActionResult<IEnumerable<EquipmentDto>> Get()
        {
            var index = _random.Next(_equipment.Count);
            _equipment[index].Status = GetNextStatus(_equipment[index].Status);

            return Ok(_equipment);
        }

        private string GetNextStatus(string current)
        {
            return current switch
            {
                "STOP" => "RUN",
                "RUN" => _random.NextDouble() > 0.7 ? "ALARM" : "RUN",
                "ALARM" => "STOP",
                _ => "STOP"
            };
        }
    }
}